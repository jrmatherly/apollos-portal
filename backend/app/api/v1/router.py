from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user

router = APIRouter(prefix="/api/v1")


@router.get("/me")
async def get_me(user: CurrentUser = Depends(get_current_user)):
    """Return the authenticated user's identity. Used to test auth flow."""
    return {
        "oid": user.oid,
        "email": user.email,
        "name": user.name,
        "roles": user.roles,
        "is_admin": user.is_admin,
    }
