from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.practice import PracticeSession
from app.schemas.curriculum import CurriculumStageResult

router = APIRouter(prefix="/curriculum", tags=["curriculum"])

# 독수리 타법 탈출용 로드맵: 왼손 → 오른손 → 양손(자음/모음/단어/문장).
# 통과 기준(pass_cpm, pass_accuracy)은 추후 튜닝.
CURRICULUM_STAGES = [
    {"id": 1, "mode": "left",      "pass_cpm": 80,  "pass_accuracy": 90},
    {"id": 2, "mode": "right",     "pass_cpm": 80,  "pass_accuracy": 90},
    {"id": 3, "mode": "consonant", "pass_cpm": 100, "pass_accuracy": 90},
    {"id": 4, "mode": "vowel",     "pass_cpm": 100, "pass_accuracy": 90},
    {"id": 5, "mode": "word",      "pass_cpm": 120, "pass_accuracy": 92},
    {"id": 6, "mode": "short",     "pass_cpm": 150, "pass_accuracy": 92},
    {"id": 7, "mode": "long",      "pass_cpm": 180, "pass_accuracy": 92},
]


@router.get("/me", response_model=list[CurriculumStageResult])
async def get_my_curriculum(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """로드맵 단계별 진행 상태 (locked / current / completed)."""
    rows = await db.execute(
        select(
            PracticeSession.mode,
            func.max(PracticeSession.cpm).label("best_cpm"),
            func.max(PracticeSession.accuracy).label("best_accuracy"),
        )
        .where(PracticeSession.user_id == current_user.id)
        .group_by(PracticeSession.mode)
    )
    best_map = {r.mode: (r.best_cpm, r.best_accuracy) for r in rows}

    results = []
    unlocked = True  # 1단계는 항상 도전 가능
    for stage in CURRICULUM_STAGES:
        best_cpm, best_accuracy = best_map.get(stage["mode"], (0, 0))
        passed = best_cpm >= stage["pass_cpm"] and best_accuracy >= stage["pass_accuracy"]

        if passed:
            status = "completed"
        elif unlocked:
            status = "current"
        else:
            status = "locked"

        results.append(CurriculumStageResult(
            id=stage["id"], mode=stage["mode"], status=status,
            best_cpm=best_cpm, best_accuracy=best_accuracy,
            pass_cpm=stage["pass_cpm"], pass_accuracy=stage["pass_accuracy"],
        ))

        unlocked = passed  # 다음 단계는 이전 단계 통과해야 unlock

    return results
