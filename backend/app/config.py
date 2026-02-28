from functools import lru_cache
from typing import Self

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Portal configuration loaded from environment variables."""

    # --- Entra ID ---
    azure_tenant_id: str = ""
    azure_client_id: str = ""
    azure_client_secret: str = ""
    azure_redirect_uri: str = "http://localhost:3000/auth/callback"

    # --- LiteLLM ---
    litellm_base_url: str = "http://litellm:4000"
    litellm_master_key: str = ""

    # --- Database ---
    database_url: str = "postgresql+asyncpg://portal:portal@localhost:5432/apollos_portal"

    # --- Email (SMTP) ---
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_tls: bool = True

    # --- Portal ---
    portal_base_url: str = "http://localhost:3000"
    default_key_duration_days: int = 90
    portal_admin_role: str = "portal_admin"

    # --- Cron Schedules ---
    notification_cron_schedule: str = "0 9 * * *"
    rotation_cron_schedule: str = "0 */6 * * *"
    deprovisioning_cron_schedule: str = "0 */6 * * *"
    reconciliation_cron_schedule: str = "0 2 * * *"

    # --- Teams Config ---
    teams_config_path: str = "teams.yaml"

    # --- Logging ---
    log_json: bool = True
    log_level: str = "INFO"

    # --- CORS ---
    cors_origins: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}

    @model_validator(mode="after")
    def _check_required_secrets(self) -> Self:
        missing = [
            name
            for name in (
                "azure_tenant_id",
                "azure_client_id",
                "azure_client_secret",
                "litellm_base_url",
                "litellm_master_key",
            )
            if not getattr(self, name)
        ]
        if missing:
            raise ValueError(f"Required secrets not set: {', '.join(missing)}")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
