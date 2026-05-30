"""
실시간 배틀 API

WebSocket /ws/battle  — 매칭 + 배틀 전체 생명주기 관리
GET /battle/rooms/{room_id}/text  — 방 텍스트 조회 (재연결 대비)
GET /battle/me/stats  — 내 배틀 통계
"""
from __future__ import annotations

import asyncio
import json
import logging
import random
import uuid
from datetime import datetime, timezone

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_token
from app.db.session import AsyncSessionLocal
from app.deps import get_db
from app.models.battle import BattleMatch
from app.models.user import User
from app.services import connection_manager as cm
from app.services.matching_worker import enqueue, dequeue, heartbeat
from app.services.mmr import (
    apply_match_result,
    get_user_mmr_for_queue,
    record_battle_cpm,
    WIN_DELTA,
    LOSE_DELTA,
)
from app.services.redis_client import get_redis

log = logging.getLogger(__name__)
router = APIRouter(prefix="/battle", tags=["battle"])


# ── 배틀 텍스트 풀 ──────────────────────────────────────────────────
# 두 플레이어가 동일한 텍스트를 타이핑하므로 서버에서 선택 후 전달

BATTLE_TEXTS = [
    "빠른 갈색 여우가 게으른 개를 뛰어넘었다.",
    "세상에서 가장 아름다운 것은 노력 끝에 얻어지는 결과이다.",
    "타이핑 실력은 꾸준한 연습과 집중력으로 길러진다.",
    "오늘 하루도 최선을 다해 키보드 위에서 실력을 증명하라.",
    "빠른 속도와 정확한 타수는 동시에 추구해야 하는 목표이다.",
    "한글 타이핑은 자음과 모음의 조합을 이해하면 훨씬 수월해진다.",
    "연습이 완벽함을 만든다는 말은 타이핑에서도 그대로 적용된다.",
    "손가락이 건반 위를 춤추듯 달릴 때 비로소 진정한 타이피스트가 된다.",
    "어떤 기술이든 처음에는 느리고 어색하지만 반복하면 자연스러워진다.",
    "집중력과 인내심, 그리고 꾸준한 반복이 실력 향상의 핵심이다.",
    "키보드를 바라보지 않고 화면만 집중하는 것이 속도 향상의 첫걸음이다.",
    "정확도를 높이는 것이 속도를 높이는 것보다 우선순위가 되어야 한다.",
    "실수를 두려워하지 말고 매번 조금씩 더 나아지는 것을 목표로 하라.",
    "모든 챔피언은 한때 초보였다. 중요한 건 포기하지 않는 것이다.",
    "타이핑 배틀에서 승리하려면 침착함과 빠른 손가락이 모두 필요하다.",
    "규칙적인 연습 루틴을 만들어 매일 조금씩 실력을 쌓아가는 것이 중요하다.",
    "높은 타수를 기록하는 것보다 꾸준히 기록을 유지하는 것이 더 어렵다.",
    "손목을 편안하게 유지하고 어깨에 긴장을 풀어야 장시간 타이핑이 가능하다.",
    "자신의 약점인 자모를 파악하고 집중적으로 연습하는 것이 효율적이다.",
    "빠르게 치는 것보다 정확하게 치는 습관이 장기적으로 더 빠른 속도를 만든다.",
]


# ── 방 상태 (Redis에 저장) ──────────────────────────────────────────
# room:{room_id} = JSON {"text", "a", "b", "a_cpm", "b_cpm", ...}

async def _create_room(r: aioredis.Redis, room_id: str, uid_a: str, uid_b: str) -> str:
    text = random.choice(BATTLE_TEXTS)
    room_data = {
        "text": text,
        "a": uid_a, "b": uid_b,
        "a_cpm": 0, "b_cpm": 0,
        "a_acc": 100, "b_acc": 100,
        "a_done": 0, "b_done": 0,
        "started_at": str(datetime.now(timezone.utc).timestamp()),
    }
    await r.hset(f"room:{room_id}", mapping=room_data)
    await r.expire(f"room:{room_id}", 300)   # 5분 후 자동 삭제
    cm.add_room(room_id, uid_a, uid_b)
    return text


async def _get_room(r: aioredis.Redis, room_id: str) -> dict | None:
    data = await r.hgetall(f"room:{room_id}")
    return data if data else None


async def _mark_done(r: aioredis.Redis, room_id: str, uid: str, cpm: int, acc: int) -> bool:
    """플레이어 완료를 기록하고, 양쪽이 모두 완료됐는지 반환한다."""
    room = await _get_room(r, room_id)
    if not room:
        return False
    side = "a" if room["a"] == uid else "b"
    await r.hset(f"room:{room_id}", mapping={
        f"{side}_cpm": cpm, f"{side}_acc": acc, f"{side}_done": 1,
    })
    updated = await r.hgetall(f"room:{room_id}")
    return updated.get("a_done") == "1" and updated.get("b_done") == "1"


# ── JWT 쿠키 인증 (WebSocket용) ─────────────────────────────────────

async def _auth_ws(ws: WebSocket) -> User | None:
    """
    WebSocket 인증 — 두 가지 방식 지원:

    1. HttpOnly 쿠키 (access_token): 직접 접속 시
    2. ws-ticket 쿼리 파라미터: Vite 프록시 등 쿠키 전달 불가 환경
       - /auth/ws-ticket 에서 발급한 UUID를 ?ticket=<uuid> 로 전달
       - Redis에서 1회 조회 후 즉시 삭제 (GETDEL)
    """
    uid: uuid.UUID | None = None

    # ① 쿠키 방식
    token = ws.cookies.get("access_token")
    if token:
        user_id_str = decode_token(token)
        if user_id_str:
            try:
                uid = uuid.UUID(user_id_str)
            except ValueError:
                pass

    # ② ws-ticket 방식 (쿠키 없거나 파싱 실패 시)
    if uid is None:
        ticket = ws.query_params.get("ticket")
        if ticket:
            try:
                r = get_redis()
                stored = await r.getdel(f"ws_ticket:{ticket}")
                if stored:
                    uid = uuid.UUID(stored)
            except Exception as e:
                log.warning("[auth_ws] ticket 검증 실패: %s", e)
    if uid is None:
        return None

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == uid))
        return result.scalar_one_or_none()


# ── 게임 종료 처리 ──────────────────────────────────────────────────

async def _finalize_game(room_id: str, uid_a: str, uid_b: str) -> None:
    """
    양쪽 완료 시 결과를 계산하고, DB에 저장하고, 양 플레이어에게 전송.
    """
    r = get_redis()
    room = await _get_room(r, room_id)
    if not room:
        return

    a_cpm, b_cpm = int(room["a_cpm"]), int(room["b_cpm"])
    a_acc, b_acc = int(room["a_acc"]), int(room["b_acc"])

    # 승자 결정 (CPM 기준, 동점이면 정확도)
    if a_cpm > b_cpm or (a_cpm == b_cpm and a_acc > b_acc):
        winner_uid, loser_uid = uid_a, uid_b
    elif b_cpm > a_cpm or (b_cpm == a_cpm and b_acc > a_acc):
        winner_uid, loser_uid = uid_b, uid_a
    else:
        winner_uid = loser_uid = None   # 무승부

    # DB에서 최신 rank_score 조회 + 업데이트
    async with AsyncSessionLocal() as db:
        res_a = await db.execute(select(User).where(User.id == uuid.UUID(uid_a)))
        res_b = await db.execute(select(User).where(User.id == uuid.UUID(uid_b)))
        user_a: User | None = res_a.scalar_one_or_none()
        user_b: User | None = res_b.scalar_one_or_none()

        mmr_delta = 0
        if user_a and user_b:
            if winner_uid == uid_a:
                new_a, new_b = await apply_match_result(
                    user_a.id, user_b.id, user_a.rank_score, user_b.rank_score
                )
                user_a.rank_score, user_b.rank_score = new_a, new_b
                mmr_delta = WIN_DELTA
            elif winner_uid == uid_b:
                new_b, new_a = await apply_match_result(
                    user_b.id, user_a.id, user_b.rank_score, user_a.rank_score
                )
                user_a.rank_score, user_b.rank_score = new_a, new_b
                mmr_delta = LOSE_DELTA

            # CPM 기록 (Redis Peak/Recent)
            await record_battle_cpm(user_a.id, a_cpm)
            await record_battle_cpm(user_b.id, b_cpm)

            # BattleMatch 저장
            match = BattleMatch(
                player_a_id=user_a.id,
                player_b_id=user_b.id,
                winner_id=uuid.UUID(winner_uid) if winner_uid else None,
                player_a_cpm=a_cpm,
                player_b_cpm=b_cpm,
                player_a_accuracy=a_acc,
                player_b_accuracy=b_acc,
                mmr_delta=abs(mmr_delta),
                mode="quick",
            )
            db.add(match)
            await db.commit()

    # 양 플레이어에게 결과 전송
    for uid, opp_uid, my_cpm, opp_cpm, my_acc, opp_acc in [
        (uid_a, uid_b, a_cpm, b_cpm, a_acc, b_acc),
        (uid_b, uid_a, b_cpm, a_cpm, b_acc, a_acc),
    ]:
        is_winner = winner_uid == uid
        delta = mmr_delta if is_winner else (LOSE_DELTA if winner_uid else 0)
        await cm.send(uid, {
            "type":          "game_end",
            "room_id":       room_id,
            "winner_id":     winner_uid,
            "your_cpm":      my_cpm,
            "opp_cpm":       opp_cpm,
            "your_accuracy": my_acc,
            "opp_accuracy":  opp_acc,
            "mmr_delta":     delta,
        })

    cm.remove_room(room_id)
    await r.delete(f"room:{room_id}")


# ── 매칭 결과 구독 루프 ─────────────────────────────────────────────

_subscriber_task: asyncio.Task | None = None


async def start_match_subscriber() -> None:
    """
    match_result 채널을 구독해 매칭 결과를 수신하고
    해당 플레이어의 WebSocket으로 matched 메시지를 전달한다.
    (이 인스턴스에 연결된 플레이어에 대해서만 처리)
    """
    global _subscriber_task
    _subscriber_task = asyncio.create_task(_subscribe_loop())


async def _subscribe_loop() -> None:
    sub_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        pubsub = sub_client.pubsub()
        await pubsub.subscribe("match_result")
        log.info("[battle] subscribed to match_result channel")

        async for msg in pubsub.listen():
            if msg["type"] != "message":
                continue
            try:
                data = json.loads(msg["data"])
                await _on_match_result(data["a"], data["b"], data["room_id"])
            except Exception as exc:
                log.error("[battle] match_result handler error: %s", exc)
    finally:
        await sub_client.aclose()


async def _on_match_result(uid_a: str, uid_b: str, room_id: str) -> None:
    r = get_redis()
    text = await _create_room(r, room_id, uid_a, uid_b)

    # 상대 정보 조회
    async with AsyncSessionLocal() as db:
        result_a = await db.execute(select(User).where(User.id == uuid.UUID(uid_a)))
        result_b = await db.execute(select(User).where(User.id == uuid.UUID(uid_b)))
        user_a: User | None = result_a.scalar_one_or_none()
        user_b: User | None = result_b.scalar_one_or_none()

    if not user_a or not user_b:
        log.error("matched user not found: %s %s", uid_a, uid_b)
        return

    # 각 플레이어에게 상대 정보 포함 matched 전송
    for my_uid, opp in [(uid_a, user_b), (uid_b, user_a)]:
        await cm.send(my_uid, {
            "type":    "matched",
            "room_id": room_id,
            "opponent": {
                "user_id":  str(opp.id),
                "username": opp.username,
                "level":    opp.level,
            },
        })

    # 카운트다운 3, 2, 1, 0 → game_start
    asyncio.create_task(_countdown_and_start(room_id, uid_a, uid_b, text))


async def _countdown_and_start(room_id: str, uid_a: str, uid_b: str, text: str) -> None:
    for i in range(3, 0, -1):
        await cm.broadcast_room(room_id, {"type": "countdown", "seconds": i})
        await asyncio.sleep(1)
    await cm.broadcast_room(room_id, {
        "type":    "game_start",
        "room_id": room_id,
        "text":    text,
    })

    # 60초 후 강제 종료
    await asyncio.sleep(60)
    r = get_redis()
    room = await _get_room(r, room_id)
    if room:
        # 아직 방이 살아있으면 타임아웃으로 종료
        log.info("battle timeout: room=%s", room_id[:8])
        # 미완료 플레이어는 현재 CPM 그대로 결산
        await _finalize_game(room_id, uid_a, uid_b)


# ── WebSocket 엔드포인트 ────────────────────────────────────────────

@router.websocket("/ws/battle")
async def battle_ws(ws: WebSocket) -> None:
    user = await _auth_ws(ws)
    if not user:
        await ws.close(code=4001, reason="Unauthorized")
        return

    await ws.accept()
    uid = str(user.id)
    cm.register(uid, ws)
    log.info("[ws] connected: %s (%s)", user.username, uid[:8])

    try:
        async for raw in ws.iter_json():
            msg_type = raw.get("type")

            # ── 매칭 큐 진입 ────────────────────────────────────────
            if msg_type == "join_queue":
                mmr = await get_user_mmr_for_queue(user.id, user.rank_score)
                await enqueue(uid, mmr)
                await ws.send_json({
                    "type": "queued",
                    "mmr":  round(mmr, 1),
                })
                log.info("[ws] %s joined queue (mmr=%.1f)", user.username, mmr)

            # ── 큐 이탈 ─────────────────────────────────────────────
            elif msg_type == "leave_queue":
                await dequeue(uid)
                await ws.send_json({"type": "dequeued"})

            # ── 생존 신호 ────────────────────────────────────────────
            elif msg_type == "heartbeat":
                await heartbeat(uid)

            # ── 타이핑 진행도 ─────────────────────────────────────────
            elif msg_type == "typing_progress":
                room_id = raw.get("room_id", "")
                if not room_id:
                    continue
                await cm.broadcast_room(room_id, {
                    "type":          "opponent_progress",
                    "correct_chars": raw.get("correct_chars", 0),
                    "cpm":           raw.get("cpm", 0),
                    "accuracy":      raw.get("accuracy", 100),
                }, exclude=uid)

            # ── 완료 선언 ────────────────────────────────────────────
            elif msg_type == "finish":
                room_id = raw.get("room_id", "")
                cpm     = int(raw.get("cpm", 0))
                acc     = int(raw.get("accuracy", 100))
                if not room_id:
                    continue

                r = get_redis()
                both_done = await _mark_done(r, room_id, uid, cpm, acc)
                room = await _get_room(r, room_id)

                if both_done and room:
                    await _finalize_game(room_id, room["a"], room["b"])
                elif not both_done:
                    # 상대에게 내가 완료했음을 알림
                    await cm.broadcast_room(room_id, {
                        "type":     "opponent_finished",
                        "cpm":      cpm,
                        "accuracy": acc,
                    }, exclude=uid)

    except WebSocketDisconnect:
        log.info("[ws] disconnected: %s", user.username)
    except Exception as exc:
        log.error("[ws] error for %s: %s", user.username, exc)
    finally:
        cm.unregister(uid)
        await dequeue(uid)
        # 배틀 중 이탈 처리 — 공개 헬퍼로 방 탐색
        for room_id in cm.find_rooms_for_user(uid):
            room_members = cm.get_room(room_id)
            if not room_members:
                continue
            a, b = room_members
            opp = b if uid == a else a
            await cm.send(opp, {"type": "opponent_left"})
            r = get_redis()
            room = await _get_room(r, room_id)
            if room:
                # 이탈자 CPM을 0으로 처리해 강제 결산
                side = "a" if a == uid else "b"
                await r.hset(f"room:{room_id}", mapping={
                    f"{side}_cpm": 0, f"{side}_acc": 0, f"{side}_done": 1
                })
                await _finalize_game(room_id, a, b)


# ── HTTP 엔드포인트 ─────────────────────────────────────────────────

@router.get("/me/stats")
async def my_battle_stats(
    db: AsyncSession = Depends(get_db),
):
    """내 배틀 통계 (승/패, 최고 CPM, 총 전적)
    TODO: current_user 인증 연결 후 활성화
    """
    return {"message": "coming soon"}
