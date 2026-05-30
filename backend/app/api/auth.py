import uuid
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, UserResponse, LevelUpdateRequest
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.services.redis_client import get_redis

router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_MAX_AGE = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # seconds


def _set_auth_cookie(response: Response, token: str) -> None:
    # HTTPS=True(프로덕션)이면 secure 쿠키 + SameSite=None(크로스 도메인 허용)
    # HTTPS=False(개발)이면 SameSite=Lax (HTTP 로컬 호환)
    is_https = settings.HTTPS
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="none" if is_https else "lax",
        secure=is_https,
        max_age=_COOKIE_MAX_AGE,
        path="/",
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    dup = await db.execute(
        select(User).where((User.username == body.username) | (User.email == body.email))
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 아이디 또는 이메일입니다")

    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    _set_auth_cookie(response, create_access_token(str(user.id)))
    return user


@router.post("/login", response_model=UserResponse)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="아이디 또는 비밀번호가 올바르지 않습니다")

    _set_auth_cookie(response, create_access_token(str(user.id)))
    return user


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/", samesite="lax")
    return {"ok": True}


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/ws-ticket")
async def get_ws_ticket(current_user: User = Depends(get_current_user)):
    """
    WebSocket 연결용 단기 티켓 발급 (30초 유효, 1회 사용)

    HttpOnly 쿠키는 Vite 프록시 → Docker 구간에서 WS 업그레이드 헤더로
    전달되지 않을 수 있으므로, 짧게 살아있는 UUID 티켓을 Redis에 저장하고
    WS URL 쿼리 파라미터로 전달한다.
    """
    ticket = str(uuid.uuid4())
    r = get_redis()
    await r.setex(f"ws_ticket:{ticket}", 30, str(current_user.id))
    return {"ticket": ticket}


@router.patch("/level", response_model=UserResponse)
async def update_level(
    body: LevelUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.level = body.level
    current_user.initial_cpm = body.initial_cpm
    await db.commit()
    await db.refresh(current_user)
    return current_user
