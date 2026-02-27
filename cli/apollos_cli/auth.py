"""MSAL device-code flow authentication for the Apollos CLI."""

import json
import sys
from pathlib import Path

import msal

# Token cache persisted to ~/.apollos/token_cache.json
CACHE_DIR = Path.home() / ".apollos"
CACHE_FILE = CACHE_DIR / "token_cache.json"
CONFIG_FILE = CACHE_DIR / "config.json"

# Scopes matching the frontend — just profile + email
SCOPES = ["User.Read", "openid", "profile", "email"]


def _load_config() -> dict:
    """Load CLI config (tenant_id, client_id, portal_url)."""
    if not CONFIG_FILE.exists():
        return {}
    return json.loads(CONFIG_FILE.read_text())


def save_config(tenant_id: str, client_id: str, portal_url: str) -> None:
    """Save CLI config to ~/.apollos/config.json."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(
        json.dumps(
            {
                "tenant_id": tenant_id,
                "client_id": client_id,
                "portal_url": portal_url,
            },
            indent=2,
        )
    )


def _get_msal_app() -> msal.PublicClientApplication:
    """Create MSAL public client from saved config."""
    config = _load_config()
    tenant_id = config.get("tenant_id")
    client_id = config.get("client_id")

    if not tenant_id or not client_id:
        print(
            "Not configured. Run 'apollos configure' first.",
            file=sys.stderr,
        )
        sys.exit(1)

    authority = f"https://login.microsoftonline.com/{tenant_id}"

    # Load persisted token cache
    cache = msal.SerializableTokenCache()
    if CACHE_FILE.exists():
        cache.deserialize(CACHE_FILE.read_text())

    app = msal.PublicClientApplication(
        client_id=client_id,
        authority=authority,
        token_cache=cache,
    )
    return app


def _save_cache(app: msal.PublicClientApplication) -> None:
    """Persist the MSAL token cache to disk."""
    cache = app.token_cache
    if cache.has_state_changed:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        CACHE_FILE.write_text(cache.serialize())


def login() -> dict:
    """Authenticate via device-code flow. Returns the token result."""
    app = _get_msal_app()

    # Check for cached accounts first
    accounts = app.get_accounts()
    if accounts:
        result = app.acquire_token_silent(SCOPES, account=accounts[0])
        if result and "access_token" in result:
            _save_cache(app)
            return result

    # Initiate device-code flow
    flow = app.initiate_device_flow(scopes=SCOPES)
    if "user_code" not in flow:
        raise RuntimeError(f"Device code flow failed: {flow.get('error_description', 'Unknown error')}")

    # Print the device code message for the user
    print(flow["message"])

    # Block until user completes auth in browser
    result = app.acquire_token_by_device_flow(flow)
    if "access_token" not in result:
        error = result.get("error_description", "Authentication failed")
        raise RuntimeError(error)

    _save_cache(app)
    return result


def get_cached_token() -> str | None:
    """Get a cached access token (silent acquire), or None if not logged in."""
    if not CONFIG_FILE.exists():
        return None

    app = _get_msal_app()
    accounts = app.get_accounts()
    if not accounts:
        return None

    result = app.acquire_token_silent(SCOPES, account=accounts[0])
    if result and "access_token" in result:
        _save_cache(app)
        return result["access_token"]

    return None


def get_current_account() -> dict | None:
    """Get the current cached account info, or None."""
    if not CONFIG_FILE.exists():
        return None

    app = _get_msal_app()
    accounts = app.get_accounts()
    if not accounts:
        return None
    return accounts[0]


def logout() -> bool:
    """Clear cached tokens. Returns True if there was a session to clear."""
    if not CONFIG_FILE.exists():
        return False

    app = _get_msal_app()
    accounts = app.get_accounts()
    if not accounts:
        return False

    for account in accounts:
        app.remove_account(account)

    _save_cache(app)
    return True
