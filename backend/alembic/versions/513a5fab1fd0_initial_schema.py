"""initial schema

Revision ID: 513a5fab1fd0
Revises:
Create Date: 2026-02-27 14:31:13.795475
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "513a5fab1fd0"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "provisioned_users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("entra_oid", sa.String(36), unique=True, nullable=False, index=True),
        sa.Column("email", sa.String(255), nullable=False, index=True),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("litellm_user_id", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("default_key_duration_days", sa.Integer(), default=90, nullable=False),
        sa.Column("notify_14d", sa.Boolean(), default=True, nullable=False),
        sa.Column("notify_7d", sa.Boolean(), default=True, nullable=False),
        sa.Column("notify_3d", sa.Boolean(), default=True, nullable=False),
        sa.Column("notify_1d", sa.Boolean(), default=True, nullable=False),
        sa.Column("deprovisioned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "provisioned_keys",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("provisioned_users.id"),
            nullable=False,
        ),
        sa.Column("litellm_key_id", sa.String(255), nullable=True, unique=True),
        sa.Column("litellm_key_alias", sa.String(255), nullable=False),
        sa.Column("team_id", sa.String(255), nullable=False, index=True),
        sa.Column("team_alias", sa.String(255), nullable=False),
        sa.Column("status", sa.String(20), default="active", nullable=False, index=True),
        sa.Column("portal_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "rotated_from_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("provisioned_keys.id"),
            nullable=True,
        ),
        sa.Column("last_spend", sa.Numeric(12, 4), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "user_team_memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("provisioned_users.id"),
            nullable=False,
        ),
        sa.Column("team_id", sa.String(255), nullable=False, index=True),
        sa.Column("team_alias", sa.String(255), nullable=False),
        sa.Column("entra_group_id", sa.String(36), nullable=False),
        sa.Column("litellm_role", sa.String(50), default="internal_user", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "team_id", name="uq_user_team"),
    )

    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("actor_email", sa.String(255), nullable=False, index=True),
        sa.Column("actor_entra_oid", sa.String(36), nullable=False),
        sa.Column("action", sa.String(100), nullable=False, index=True),
        sa.Column("target_type", sa.String(50), nullable=False),
        sa.Column("target_id", sa.String(255), nullable=False),
        sa.Column("details", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "key_notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "key_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("provisioned_keys.id"),
            nullable=False,
        ),
        sa.Column("notification_type", sa.String(20), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("key_id", "notification_type", name="uq_key_notification"),
    )


def downgrade() -> None:
    op.drop_table("key_notifications")
    op.drop_table("audit_log")
    op.drop_table("user_team_memberships")
    op.drop_table("provisioned_keys")
    op.drop_table("provisioned_users")
