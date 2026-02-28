from __future__ import annotations

import logging

from sqlalchemy import select

from app.config import Settings
from app.core.database import async_session_factory
from app.models.provisioned_key import ProvisionedKey
from app.services.audit import ACTION_RECONCILIATION_DRIFT, log_action
from app.services.litellm_client import LiteLLMClient

logger = logging.getLogger(__name__)


async def run_reconciliation_job(settings: Settings) -> None:
    """Cron entry point: compare portal DB active keys against LiteLLM.

    Detects two classes of drift:
    - portal_only: key is active in portal DB but not found in LiteLLM
    - litellm_only: key exists in LiteLLM but has no portal DB record

    Drift is flagged in the audit log for admin review. No auto-remediation.
    """
    logger.info("Starting reconciliation job")

    # Fresh client per job run — isolates cron HTTP state from the request-path singleton
    litellm = LiteLLMClient(settings)

    try:
        # Fetch portal DB active keys — extract scalar fields before closing session
        async with async_session_factory() as session:
            result = await session.execute(
                select(ProvisionedKey).where(ProvisionedKey.status == "active")
            )
            portal_keys = result.scalars().all()
            portal_key_map: dict[str, dict] = {}
            for k in portal_keys:
                if k.litellm_key_id:
                    portal_key_map[k.litellm_key_id] = {
                        "id": str(k.id),
                        "alias": k.litellm_key_alias,
                    }

        portal_key_ids = set(portal_key_map.keys())

        # Fetch LiteLLM key list
        litellm_keys = await litellm.list_keys()
        litellm_key_ids = set()
        for k in litellm_keys:
            key_id = k.get("token") or k.get("key_name")
            if key_id:
                litellm_key_ids.add(key_id)

        # Compare
        portal_only = portal_key_ids - litellm_key_ids
        litellm_only = litellm_key_ids - portal_key_ids

        drift_count = 0

        if portal_only:
            logger.warning(
                "Reconciliation drift: %d portal-active keys not found in LiteLLM",
                len(portal_only),
            )
            async with async_session_factory() as session:
                for key_id in portal_only:
                    key_info = portal_key_map.get(key_id)
                    await log_action(
                        session,
                        actor_email="system@apollos-ai",
                        actor_entra_oid="system",
                        action=ACTION_RECONCILIATION_DRIFT,
                        target_type="key",
                        target_id=key_info["id"] if key_info else key_id,
                        details={
                            "drift_type": "portal_only",
                            "litellm_key_id": key_id,
                            "key_alias": key_info["alias"] if key_info else None,
                        },
                    )
                    drift_count += 1
                await session.commit()

        if litellm_only:
            logger.warning(
                "Reconciliation drift: %d LiteLLM keys not tracked in portal",
                len(litellm_only),
            )
            async with async_session_factory() as session:
                for key_id in litellm_only:
                    await log_action(
                        session,
                        actor_email="system@apollos-ai",
                        actor_entra_oid="system",
                        action=ACTION_RECONCILIATION_DRIFT,
                        target_type="key",
                        target_id=key_id,
                        details={"drift_type": "litellm_only", "litellm_key_id": key_id},
                    )
                    drift_count += 1
                await session.commit()

        # TODO(4.8): Send admin notification (email/webhook) when drift is detected
        # TODO(4.6): Extend to reconcile users (/user/list) and teams (/team/list)
        logger.info("Reconciliation job complete: %d drift items flagged", drift_count)
    finally:
        await litellm.close()
