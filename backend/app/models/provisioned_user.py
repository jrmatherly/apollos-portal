from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.provisioned_key import ProvisionedKey
    from app.models.user_team_membership import UserTeamMembership


class ProvisionedUser(Base):
    __tablename__ = "provisioned_users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entra_oid: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    litellm_user_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    default_key_duration_days: Mapped[int] = mapped_column(default=90, nullable=False)
    notify_14d: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_7d: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_3d: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_1d: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deprovisioned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    keys: Mapped[list[ProvisionedKey]] = relationship(back_populates="user", lazy="selectin")
    team_memberships: Mapped[list[UserTeamMembership]] = relationship(back_populates="user", lazy="selectin")
