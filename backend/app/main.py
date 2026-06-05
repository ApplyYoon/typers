from contextlib import asynccontextmanager
import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import auth, practice, dictionaries
from app.api.battle import router as battle_router, start_match_subscriber
from app.api.goal import router as goal_router
from app.services.redis_client import open_redis, close_redis
from app.services.matching_worker import start_matching_worker, stop_matching_worker

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan — 앱 시작/종료 시 실행되는 코드.

    시작:
      1. Redis 연결 풀 초기화
      2. match_result Pub/Sub 구독 시작
      3. 매칭 워커 시작 (Active/Standby 경쟁)

    종료:
      1. 매칭 워커 중지
      2. Redis 연결 풀 해제
    """
    # ── 시작 ─────────────────────────────────────────────────────
    log.info("Starting Typers API...")
    await open_redis()
    await start_match_subscriber()
    asyncio.create_task(start_matching_worker())
    log.info("Matching worker started.")

    yield

    # ── 종료 ─────────────────────────────────────────────────────
    log.info("Shutting down Typers API...")
    await stop_matching_worker()
    await close_redis()


app = FastAPI(title="Typers API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(practice.router)
app.include_router(dictionaries.router)
app.include_router(battle_router)
app.include_router(goal_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
