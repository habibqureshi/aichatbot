from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from db.db import get_db
from schemas.auth import Token, LoginPayload, RefreshRequest, LogoutRequest
from schemas.user import UserCreate, User as UserSchema
from services import auth_service

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=Token)
async def login(payload: LoginPayload, db: AsyncSession = Depends(get_db)):
    user = await auth_service.authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    access_token = auth_service.create_access_token({"user_id": user.id})
    refresh_token = await auth_service.create_refresh_token(db, user.id)
    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}


@router.post(
    "/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED
)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    user = await auth_service.create_user(
        db,
        username=payload.username,
        password=payload.password,
        full_name=payload.full_name,
    )
    return UserSchema.model_validate(user)


@router.post("/refresh", response_model=Token)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    tokens = await auth_service.refresh_access_token(db, payload.refresh_token)
    return {"access_token": tokens["access_token"], "token_type": "bearer", "refresh_token": tokens["refresh_token"]}


@router.post("/logout")
async def logout(payload: LogoutRequest, db: AsyncSession = Depends(get_db)):
    await auth_service.revoke_refresh_token(db, payload.refresh_token)
    return {"message": "ok"}


@router.get("/me", response_model=UserSchema)
async def me(current_user=Depends(auth_service.get_current_user)):
    return UserSchema.model_validate(current_user)
