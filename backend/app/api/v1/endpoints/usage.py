import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_session
from app.models.provisioned_user import ProvisionedUser
from app.schemas.common import UsageDataPoint, UsageResponse, UsageSummary
from app.services.litellm_client import LiteLLMClient, get_litellm_client

logger = structlog.stdlib.get_logger(__name__)

router = APIRouter()


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    litellm: LiteLLMClient = Depends(get_litellm_client),
    start_date: str | None = Query(None, max_length=10, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str | None = Query(None, max_length=10, pattern=r"^\d{4}-\d{2}-\d{2}$"),
):
    """Get usage/spend data for the current user."""
    result = await session.execute(select(ProvisionedUser).where(ProvisionedUser.entra_oid == user.oid))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not provisioned")

    try:
        logs = await litellm.get_spend_logs(
            user_id=db_user.litellm_user_id or user.email,
            start_date=start_date,
            end_date=end_date,
        )
    except Exception:
        logger.exception("Failed to fetch spend logs from LiteLLM")
        return UsageResponse()

    # Aggregate spend logs into data points
    data_points: list[UsageDataPoint] = []
    total_spend = 0.0
    total_tokens = 0
    total_requests = 0

    for log in logs:
        spend = log.get("spend", 0) or 0
        input_tokens = log.get("prompt_tokens", 0) or 0
        output_tokens = log.get("completion_tokens", 0) or 0
        model = log.get("model", "unknown")
        date = log.get("startTime") or log.get("start_time") or ""

        # Parse date to just the date portion
        if date and "T" in str(date):
            date = str(date).split("T")[0]

        data_points.append(
            UsageDataPoint(
                date=str(date),
                model=model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                spend=float(spend),
                requests=1,
            )
        )
        total_spend += float(spend)
        total_tokens += input_tokens + output_tokens
        total_requests += 1

    return UsageResponse(
        data=data_points,
        summary=UsageSummary(
            total_spend=total_spend,
            total_tokens=total_tokens,
            total_requests=total_requests,
        ),
    )
