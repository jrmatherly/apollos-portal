"""Tests for reconciliation_service: portal vs LiteLLM drift detection."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.services.reconciliation_service import run_reconciliation_job

from .conftest import FakeProvisionedKey


def _make_settings():
    settings = MagicMock()
    settings.litellm_base_url = "http://litellm:4000"
    settings.litellm_master_key = "sk-master"
    return settings


def _make_portal_key(litellm_key_id: str | None = None, **kwargs) -> FakeProvisionedKey:
    return FakeProvisionedKey(
        litellm_key_id=litellm_key_id,
        status="active",
        **kwargs,
    )


class TestReconciliationJob:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_no_drift_produces_no_audit(self):
        """When portal and LiteLLM have the same keys, no drift logged."""
        portal_key = _make_portal_key(litellm_key_id="tok-1")

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [portal_key]
        mock_session.execute = AsyncMock(return_value=mock_result)

        mock_litellm = AsyncMock()
        mock_litellm.list_keys = AsyncMock(return_value=[{"token": "tok-1"}])
        mock_litellm.close = AsyncMock()

        with (
            patch("app.services.reconciliation_service.async_session_factory") as mock_sf,
            patch("app.services.reconciliation_service.LiteLLMClient", return_value=mock_litellm),
            patch("app.services.reconciliation_service.log_action", new_callable=AsyncMock) as mock_log,
        ):
            mock_sf.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_sf.return_value.__aexit__ = AsyncMock(return_value=False)
            await run_reconciliation_job(_make_settings())

        mock_log.assert_not_called()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_portal_only_drift_detected(self):
        """Key in portal but not in LiteLLM is flagged as portal_only drift."""
        portal_key = _make_portal_key(litellm_key_id="tok-portal-only")

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [portal_key]
        mock_session.execute = AsyncMock(return_value=mock_result)
        mock_session.commit = AsyncMock()

        mock_litellm = AsyncMock()
        mock_litellm.list_keys = AsyncMock(return_value=[])  # empty — key not in LiteLLM
        mock_litellm.close = AsyncMock()

        with (
            patch("app.services.reconciliation_service.async_session_factory") as mock_sf,
            patch("app.services.reconciliation_service.LiteLLMClient", return_value=mock_litellm),
            patch("app.services.reconciliation_service.log_action", new_callable=AsyncMock) as mock_log,
        ):
            mock_sf.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_sf.return_value.__aexit__ = AsyncMock(return_value=False)
            await run_reconciliation_job(_make_settings())

        assert mock_log.call_count == 1
        call_kwargs = mock_log.call_args.kwargs
        assert call_kwargs["details"]["drift_type"] == "portal_only"

    @pytest.mark.asyncio(loop_scope="function")
    async def test_litellm_only_drift_detected(self):
        """Key in LiteLLM but not in portal is flagged as litellm_only drift."""
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []  # no portal keys
        mock_session.execute = AsyncMock(return_value=mock_result)
        mock_session.commit = AsyncMock()

        mock_litellm = AsyncMock()
        mock_litellm.list_keys = AsyncMock(return_value=[{"token": "tok-orphan"}])
        mock_litellm.close = AsyncMock()

        with (
            patch("app.services.reconciliation_service.async_session_factory") as mock_sf,
            patch("app.services.reconciliation_service.LiteLLMClient", return_value=mock_litellm),
            patch("app.services.reconciliation_service.log_action", new_callable=AsyncMock) as mock_log,
        ):
            mock_sf.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_sf.return_value.__aexit__ = AsyncMock(return_value=False)
            await run_reconciliation_job(_make_settings())

        assert mock_log.call_count == 1
        call_kwargs = mock_log.call_args.kwargs
        assert call_kwargs["details"]["drift_type"] == "litellm_only"

    @pytest.mark.asyncio(loop_scope="function")
    async def test_keys_without_litellm_id_skipped(self):
        """Portal keys with no litellm_key_id should not appear in comparison."""
        portal_key = _make_portal_key(litellm_key_id=None)

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [portal_key]
        mock_session.execute = AsyncMock(return_value=mock_result)

        mock_litellm = AsyncMock()
        mock_litellm.list_keys = AsyncMock(return_value=[])
        mock_litellm.close = AsyncMock()

        with (
            patch("app.services.reconciliation_service.async_session_factory") as mock_sf,
            patch("app.services.reconciliation_service.LiteLLMClient", return_value=mock_litellm),
            patch("app.services.reconciliation_service.log_action", new_callable=AsyncMock) as mock_log,
        ):
            mock_sf.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_sf.return_value.__aexit__ = AsyncMock(return_value=False)
            await run_reconciliation_job(_make_settings())

        # No drift — key with no litellm_key_id is excluded from comparison
        mock_log.assert_not_called()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_bidirectional_drift(self):
        """Both portal-only and LiteLLM-only drift detected in same run."""
        portal_key = _make_portal_key(litellm_key_id="tok-portal-only")

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [portal_key]
        mock_session.execute = AsyncMock(return_value=mock_result)
        mock_session.commit = AsyncMock()

        mock_litellm = AsyncMock()
        mock_litellm.list_keys = AsyncMock(return_value=[{"token": "tok-litellm-only"}])
        mock_litellm.close = AsyncMock()

        with (
            patch("app.services.reconciliation_service.async_session_factory") as mock_sf,
            patch("app.services.reconciliation_service.LiteLLMClient", return_value=mock_litellm),
            patch("app.services.reconciliation_service.log_action", new_callable=AsyncMock) as mock_log,
        ):
            mock_sf.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_sf.return_value.__aexit__ = AsyncMock(return_value=False)
            await run_reconciliation_job(_make_settings())

        # Both drift types logged
        assert mock_log.call_count == 2
        drift_types = {call.kwargs["details"]["drift_type"] for call in mock_log.call_args_list}
        assert drift_types == {"portal_only", "litellm_only"}
