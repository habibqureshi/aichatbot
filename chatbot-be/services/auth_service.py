from datetime import datetime, timedelta
from typing import Any
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

from configs import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
    JWT_REFRESH_TOKEN_EXPIRE_DAYS,
)
from db.db import get_db
from db.models import User as UserModel, RefreshToken as RefreshTokenModel
import secrets
from datetime import timezone

bearer_token = HTTPBearer()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict[str, Any], expires_delta: int | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=(expires_delta or JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        ) from exc


async def get_user_by_username(db: AsyncSession, username: str) -> UserModel | None:
    result = await db.execute(select(UserModel).where(UserModel.username == username))
    return result.unique().scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> UserModel | None:
    result = await db.execute(
        select(UserModel).where(UserModel.id == user_id, UserModel.is_active == True)
    )
    return result.unique().scalar_one_or_none()


async def create_user(
    db: AsyncSession, username: str, password: str, full_name: str | None = None
) -> UserModel:
    hashed = get_password_hash(password)
    user = UserModel(username=username, hashed_password=hashed, full_name=full_name)
    db.add(user)
    try:
        await db.flush()
        await db.commit()
        return await get_user_by_id(db, user.id)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="User already exists") from exc


async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(bearer_token),
    db: AsyncSession = Depends(get_db),
) -> object:
    payload = decode_access_token(token.credentials)
    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    user = await get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return user


async def authenticate_user(
    db: AsyncSession, username: str, password: str
) -> UserModel | None:
    user = await get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def create_refresh_token(db: AsyncSession, user_id: int) -> str:
    token = secrets.token_urlsafe(48)
    # ensure expires_at is timezone-aware UTC
    expires_at = datetime.now(timezone.utc).replace(tzinfo=timezone.utc) + timedelta(
        days=JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    rt = RefreshTokenModel(user_id=user_id, token=token, expires_at=expires_at)
    db.add(rt)
    await db.flush()
    await db.commit()
    return token


async def get_refresh_token_by_token(
    db: AsyncSession, token: str
) -> RefreshTokenModel | None:
    result = await db.execute(
        select(RefreshTokenModel).where(RefreshTokenModel.token == token)
    )
    return result.unique().scalar_one_or_none()


async def revoke_refresh_token(db: AsyncSession, token: str) -> None:
    rt = await get_refresh_token_by_token(db, token)
    if not rt:
        return
    rt.revoked = True
    await db.flush()
    await db.commit()


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> dict[str, str]:
    rt = await get_refresh_token_by_token(db, refresh_token)
    if not rt:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
    if rt.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked"
        )
    # Normalize expires_at to be timezone-aware UTC if DB returned a naive datetime
    if rt.expires_at is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalid"
        )
    expires_at = rt.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired"
        )

    user = await get_user_by_id(db, rt.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )

    # rotate: revoke old token and issue a new one
    rt.revoked = True
    await db.flush()
    new_refresh = await create_refresh_token(db, user.id)
    access = create_access_token({"user_id": user.id})
    return {"access_token": access, "refresh_token": new_refresh}
