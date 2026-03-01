from fastapi import APIRouter, Depends, HTTPException, Path, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_session
from app.core.rate_limit import limiter
from app.schemas.keys import KeyCreateRequest, KeyCreateResponse, KeyListResponse, KeyRevokeResponse, KeyRotateResponse
from app.services.key_service import create_key, list_user_keys, revoke_key, rotate_key
from app.services.litellm_client import LiteLLMClient, get_litellm_client

router = APIRouter()


@router.get("/keys", response_model=KeyListResponse)
@limiter.limit("60/minute")
async def get_keys(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List all keys for the current user."""
    try:
        return await list_user_keys(session, user)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from None


@router.post("/keys/new", response_model=KeyCreateResponse)
@limiter.limit("10/minute")
async def generate_new_key(
    request: Request,
    body: KeyCreateRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    litellm: LiteLLMClient = Depends(get_litellm_client),
):
    """Generate a new API key for the user on a specific team."""
    try:
        return await create_key(session, litellm, user, body.team_id)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from None


@router.post("/keys/{key_id}/rotate", response_model=KeyRotateResponse)
@limiter.limit("5/minute")
async def rotate_existing_key(
    request: Request,
    key_id: str = Path(max_length=36),
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    litellm: LiteLLMClient = Depends(get_litellm_client),
):
    """Rotate a key: block old, generate new."""
    try:
        return await rotate_key(session, litellm, user, key_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None


@router.post("/keys/{key_id}/revoke", response_model=KeyRevokeResponse)
@limiter.limit("5/minute")
async def revoke_existing_key(
    request: Request,
    key_id: str = Path(max_length=36),
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    litellm: LiteLLMClient = Depends(get_litellm_client),
):
    """Revoke a key (soft-delete via block)."""
    try:
        return await revoke_key(session, litellm, user, key_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None
