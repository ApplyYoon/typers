import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.goal import UserGoal
from app.models.practice import PracticeSession
from app.schemas.goal import GoalCreate, GoalResponse

router = APIRouter(prefix="/goals", tags=["goals"])

DAILY_MINUTES_CAP = 60      # 상한선
CPM_GAIN_PER_MINUTE = 0.5   # 분당 CPM 향상 추정치 (하루 20분 → 주당 ~10 CPM)


async def _get_current_cpm(user: User, db: AsyncSession) -> int:
    """최근 7일 평균 CPM. 기록 없으면 레벨테스트 initial_cpm 폴백."""
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)
    result = await db.execute(
        select(func.avg(PracticeSession.cpm))
        .where(PracticeSession.user_id == user.id)
        .where(PracticeSession.created_at >= cutoff)
    )
    avg = result.scalar()
    if avg is not None:
        return int(avg)
    return user.initial_cpm or 0


def _calc_plan(target_cpm: int, current_cpm: int, deadline: datetime.date) -> dict:
    today = datetime.date.today()
    days_left = max((deadline - today).days, 1)  # 최소 1일 클램핑
    gap = max(target_cpm - current_cpm, 0)
    is_achieved = gap == 0

    if is_achieved:
        return {
            "days_left": days_left,
            "daily_minutes": 0,
            "progress_pct": 100,
            "is_achieved": True,
            "warning": None,
        }

    # 하루 권장 연습량 계산
    daily_cpm_needed = gap / days_left
    daily_minutes = int(daily_cpm_needed / CPM_GAIN_PER_MINUTE)

    warning = None
    if daily_minutes > DAILY_MINUTES_CAP:
        warning = "기간이 너무 짧아요. 마감일을 늘려보세요."
        daily_minutes = DAILY_MINUTES_CAP

    progress_pct = min(int((current_cpm / target_cpm) * 100), 99) if target_cpm > 0 else 0

    return {
        "days_left": days_left,
        "daily_minutes": max(daily_minutes, 5),  # 최소 5분
        "progress_pct": progress_pct,
        "is_achieved": False,
        "warning": warning,
    }


@router.post("/me", response_model=GoalResponse, status_code=200)
async def upsert_goal(
    body: GoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """목표 설정 / 업데이트 (upsert). 유저당 1개."""
    result = await db.execute(
        select(UserGoal).where(UserGoal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()

    if goal:
        goal.target_cpm = body.target_cpm
        goal.deadline = body.deadline
        goal.updated_at = datetime.datetime.now(datetime.timezone.utc)
    else:
        goal = UserGoal(
            user_id=current_user.id,
            target_cpm=body.target_cpm,
            deadline=body.deadline,
        )
        db.add(goal)

    await db.commit()
    await db.refresh(goal)

    current_cpm = await _get_current_cpm(current_user, db)
    plan = _calc_plan(goal.target_cpm, current_cpm, goal.deadline)

    return GoalResponse(
        target_cpm=goal.target_cpm,
        deadline=goal.deadline,
        current_cpm=current_cpm,
        **plan,
    )


@router.get("/me", response_model=GoalResponse)
async def get_my_goal(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """내 목표 + 오늘의 플랜 조회."""
    result = await db.execute(
        select(UserGoal).where(UserGoal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()

    if goal is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="목표가 설정되지 않았습니다")

    current_cpm = await _get_current_cpm(current_user, db)
    plan = _calc_plan(goal.target_cpm, current_cpm, goal.deadline)

    return GoalResponse(
        target_cpm=goal.target_cpm,
        deadline=goal.deadline,
        current_cpm=current_cpm,
        **plan,
    )


@router.delete("/me", status_code=204)
async def delete_goal(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """목표 삭제."""
    result = await db.execute(
        select(UserGoal).where(UserGoal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if goal:
        await db.delete(goal)
        await db.commit()
