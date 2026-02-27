from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_session
from app.schemas.keys import KeyCreateRequest, KeyCreateResponse, KeyListResponse, KeyRevokeResponse, KeyRotateResponse
from app.services.key_service import create_key, list_user_keys, revoke_key, rotate_key
from app.services.litellm_client import LiteLLMClient, get_litellm_client

router = APIRouter()


@router.get("/keys", response_model=KeyListResponse)
async def get_keys(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List all keys for the current user."""
    try:
        return await list_user_keys(session, user)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/keys/new", response_model=KeyCreateResponse)
async def generate_new_key(
    body: KeyCreateRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    litellm: LiteLLMClient = Depends(get_litellm_client),
):
    """Generate a new API key for the user on a specific team."""
    try:
        return await create_key(session, litellm, user, body.team_id)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/keys/{key_id}/rotate", response_model=KeyRotateResponse)
async def rotate_existing_key(
    key_id: str,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    litellm: LiteLLMClient = Depends(get_litellm_client),
):
    """Rotate a key: block old, generate new."""
    try:
        return await rotate_key(session, litellm, user, key_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/keys/{key_id}/revoke", response_model=KeyRevokeResponse)
async def revoke_existing_key(
    key_id: str,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    litellm: LiteLLMClient = Depends(get_litellm_client),
):
    """Revoke a key (soft-delete via block)."""
    try:
        return await revoke_key(session, litellm, user, key_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
