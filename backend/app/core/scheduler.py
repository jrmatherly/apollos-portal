from __future__ import annotations

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import Settings

logger = structlog.stdlib.get_logger(__name__)


def setup_scheduler(settings: Settings) -> AsyncIOScheduler:
    """Create and configure the APScheduler AsyncIOScheduler.

    Registers all four cron jobs. Caller must call scheduler.start()
    and scheduler.shutdown() (done in the lifespan context manager).
    """
    from app.services.deprovisioning_service import run_deprovisioning_job
    from app.services.notification_service import run_notification_job
    from app.services.reconciliation_service import run_reconciliation_job
    from app.services.rotation_service import run_rotation_job

    scheduler = AsyncIOScheduler()

    scheduler.add_job(
        run_notification_job,
        CronTrigger.from_crontab(settings.notification_cron_schedule),
        id="notification_job",
        kwargs={"settings": settings},
        replace_existing=True,
    )

    scheduler.add_job(
        run_rotation_job,
        CronTrigger.from_crontab(settings.rotation_cron_schedule),
        id="rotation_job",
        kwargs={"settings": settings},
        replace_existing=True,
    )

    scheduler.add_job(
        run_deprovisioning_job,
        CronTrigger.from_crontab(settings.deprovisioning_cron_schedule),
        id="deprovisioning_job",
        kwargs={"settings": settings},
        replace_existing=True,
    )

    scheduler.add_job(
        run_reconciliation_job,
        CronTrigger.from_crontab(settings.reconciliation_cron_schedule),
        id="reconciliation_job",
        kwargs={"settings": settings},
        replace_existing=True,
    )

    logger.info(
        "Scheduler configured: notification=%s rotation=%s deprovisioning=%s reconciliation=%s",
        settings.notification_cron_schedule,
        settings.rotation_cron_schedule,
        settings.deprovisioning_cron_schedule,
        settings.reconciliation_cron_schedule,
    )

    return scheduler
