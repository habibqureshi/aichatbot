from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: str | None = None

    model_config = ConfigDict(from_attributes=True)


class TokenPayload(BaseModel):
    user_id: int
    tenant_id: int

    model_config = ConfigDict(from_attributes=True)


class LoginPayload(BaseModel):
    username: str
    password: str

    model_config = ConfigDict(from_attributes=True)


class RefreshRequest(BaseModel):
    refresh_token: str

    model_config = ConfigDict(from_attributes=True)


class LogoutRequest(BaseModel):
    refresh_token: str

    model_config = ConfigDict(from_attributes=True)
