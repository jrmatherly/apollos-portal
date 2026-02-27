import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class UserTeamMembership(Base):
    __tablename__ = "user_team_memberships"
    __table_args__ = (UniqueConstraint("user_id", "team_id", name="uq_user_team"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("provisioned_users.id"), nullable=False)
    team_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    team_alias: Mapped[str] = mapped_column(String(255), nullable=False)
    entra_group_id: Mapped[str] = mapped_column(String(36), nullable=False)
    litellm_role: Mapped[str] = mapped_column(String(50), default="internal_user", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["ProvisionedUser"] = relationship(back_populates="team_memberships")
