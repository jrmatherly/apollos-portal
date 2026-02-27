from fastapi import APIRouter

from app.api.v1.endpoints import auth, keys, models, provision, settings, teams, usage

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router, tags=["auth"])
router.include_router(provision.router, tags=["provision"])
router.include_router(keys.router, tags=["keys"])
router.include_router(teams.router, tags=["teams"])
router.include_router(usage.router, tags=["usage"])
router.include_router(models.router, tags=["models"])
router.include_router(settings.router, tags=["settings"])
