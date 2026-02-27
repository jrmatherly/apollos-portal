from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_session
from app.models.provisioned_user import ProvisionedUser
from app.schemas.settings import UserSettingsResponse, UserSettingsUpdate
from app.services.audit import ACTION_SETTINGS_UPDATED, log_action

router = APIRouter()


@router.get("/settings", response_model=UserSettingsResponse)
async def get_settings_endpoint(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get the current user's preferences."""
    result = await session.execute(
        select(ProvisionedUser).where(ProvisionedUser.entra_oid == user.oid)
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not provisioned")

    return UserSettingsResponse(
        default_key_duration_days=db_user.default_key_duration_days,
        notify_14d=db_user.notify_14d,
        notify_7d=db_user.notify_7d,
        notify_3d=db_user.notify_3d,
        notify_1d=db_user.notify_1d,
    )


@router.patch("/settings", response_model=UserSettingsResponse)
async def update_settings(
    body: UserSettingsUpdate,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Update the current user's preferences."""
    result = await session.execute(
        select(ProvisionedUser).where(ProvisionedUser.entra_oid == user.oid)
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not provisioned")

    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    # Validate key duration
    if "default_key_duration_days" in changes:
        allowed = (30, 60, 90, 180)
        if changes["default_key_duration_days"] not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Key duration must be one of {allowed}",
            )

    for field, value in changes.items():
        setattr(db_user, field, value)

    await log_action(
        session,
        actor_email=user.email,
        actor_entra_oid=user.oid,
        action=ACTION_SETTINGS_UPDATED,
        target_type="user",
        target_id=str(db_user.id),
        details=changes,
    )
    await session.commit()

    return UserSettingsResponse(
        default_key_duration_days=db_user.default_key_duration_days,
        notify_14d=db_user.notify_14d,
        notify_7d=db_user.notify_7d,
        notify_3d=db_user.notify_3d,
        notify_1d=db_user.notify_1d,
    )
