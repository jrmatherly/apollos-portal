from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.provisioned_user import ProvisionedUser


class ProvisionedKey(Base):
    __tablename__ = "provisioned_keys"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("provisioned_users.id"), nullable=False)
    litellm_key_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    litellm_key_alias: Mapped[str] = mapped_column(String(255), nullable=False)
    team_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    team_alias: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False, index=True)
    portal_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    rotated_from_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("provisioned_keys.id"), nullable=True
    )
    last_spend: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[ProvisionedUser] = relationship(back_populates="keys", lazy="raise")
    rotated_from: Mapped[ProvisionedKey | None] = relationship(remote_side="ProvisionedKey.id")
