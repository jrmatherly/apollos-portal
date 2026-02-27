"""Apollos AI CLI — device-code auth + portal interaction."""

import sys

import click
import httpx
from rich.console import Console
from rich.table import Table

from apollos_cli.auth import (
    get_cached_token,
    get_current_account,
    login,
    logout,
    save_config,
    _load_config,
)

console = Console()


@click.group()
def cli():
    """Apollos AI Self-Service Portal CLI."""
    pass


@cli.command()
@click.option("--tenant-id", prompt="Azure Tenant ID", help="Entra ID tenant")
@click.option("--client-id", prompt="Azure Client ID", help="App registration client ID")
@click.option(
    "--portal-url",
    prompt="Portal API URL",
    default="http://localhost:8000",
    help="Backend API base URL",
)
def configure(tenant_id: str, client_id: str, portal_url: str):
    """Configure the CLI with Azure and portal settings."""
    save_config(tenant_id, client_id, portal_url)
    console.print("[green]Configuration saved to ~/.apollos/config.json[/green]")


@cli.command()
def login_cmd():
    """Authenticate with your organization account (device-code flow)."""
    try:
        result = login()
        name = result.get("id_token_claims", {}).get("name", "Unknown")
        console.print(f"[green]Authenticated as {name}[/green]")
    except RuntimeError as e:
        console.print(f"[red]Login failed: {e}[/red]")
        sys.exit(1)


# Register as 'login' command name
login_cmd.name = "login"


@cli.command()
def logout_cmd():
    """Clear cached authentication tokens."""
    if logout():
        console.print("[green]Logged out successfully.[/green]")
    else:
        console.print("[yellow]No active session to clear.[/yellow]")


logout_cmd.name = "logout"


@cli.command()
def whoami():
    """Show the currently authenticated user."""
    account = get_current_account()
    if not account:
        console.print("[yellow]Not logged in. Run 'apollos login' first.[/yellow]")
        sys.exit(1)

    table = Table(title="Current User")
    table.add_column("Field", style="cyan")
    table.add_column("Value")
    table.add_row("Name", account.get("name", "N/A"))
    table.add_row("Username", account.get("username", "N/A"))
    table.add_row("Tenant", account.get("home_account_id", "N/A").split(".")[1] if "." in account.get("home_account_id", "") else "N/A")
    console.print(table)


@cli.command()
def me():
    """Fetch your profile from the portal backend (/api/v1/me)."""
    token = get_cached_token()
    if not token:
        console.print("[yellow]Not logged in. Run 'apollos login' first.[/yellow]")
        sys.exit(1)

    config = _load_config()
    portal_url = config.get("portal_url", "http://localhost:8000")

    try:
        resp = httpx.get(
            f"{portal_url}/api/v1/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        table = Table(title="Portal Profile")
        table.add_column("Field", style="cyan")
        table.add_column("Value")
        table.add_row("OID", data.get("oid", "N/A"))
        table.add_row("Name", data.get("name", "N/A"))
        table.add_row("Email", data.get("email", "N/A"))
        table.add_row("Admin", str(data.get("is_admin", False)))
        table.add_row("Roles", ", ".join(data.get("roles", [])) or "None")
        console.print(table)
    except httpx.HTTPStatusError as e:
        console.print(f"[red]API error: {e.response.status_code} — {e.response.text}[/red]")
        sys.exit(1)
    except httpx.ConnectError:
        console.print(f"[red]Cannot connect to portal at {portal_url}[/red]")
        sys.exit(1)


if __name__ == "__main__":
    cli()
