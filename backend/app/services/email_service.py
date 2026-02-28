from __future__ import annotations

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

import aiosmtplib
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import Settings

logger = logging.getLogger(__name__)

_TEMPLATE_DIR = Path(__file__).parent.parent / "templates" / "email"
_jinja_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATE_DIR)),
    autoescape=select_autoescape(["html"]),
)


def render_template(template_name: str, context: dict) -> str:
    """Render a Jinja2 HTML email template."""
    template = _jinja_env.get_template(template_name)
    return template.render(**context)


async def send_email(
    *,
    settings: Settings,
    to_email: str,
    subject: str,
    html_body: str,
) -> None:
    """Send a single HTML email via aiosmtplib.

    Skips silently if smtp_host is not configured (dev/test environments).
    Logs errors but does NOT raise — notification failures must not crash cron jobs.
    """
    if not settings.smtp_host:
        logger.debug("SMTP not configured, skipping email to %s (subject: %s)", to_email, subject)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_username or None,
            password=settings.smtp_password or None,
            start_tls=settings.smtp_use_tls,
        )
        logger.info("Email sent to %s: %s", to_email, subject)
    except Exception:
        logger.exception("Failed to send email to %s (subject: %s)", to_email, subject)
