from datetime import date
from pydantic import BaseModel, field_validator
from datetime import date as date_type
import datetime


class GoalCreate(BaseModel):
    target_cpm: int
    deadline: date

    @field_validator("target_cpm")
    @classmethod
    def validate_target_cpm(cls, v: int) -> int:
        if v < 50 or v > 1000:
            raise ValueError("목표 타수는 50~1000 사이여야 합니다")
        return v

    @field_validator("deadline")
    @classmethod
    def validate_deadline(cls, v: date_type) -> date_type:
        if v <= datetime.date.today():
            raise ValueError("마감일은 오늘 이후여야 합니다")
        return v


class GoalResponse(BaseModel):
    target_cpm: int
    deadline: date
    current_cpm: int
    days_left: int
    daily_minutes: int
    progress_pct: int
    is_achieved: bool
    warning: str | None = None

    # 데일리 가이드
    today_minutes: int = 0       # 오늘 연습한 분
    today_completed: bool = False # 오늘 목표 달성 여부
    streak: int = 0               # 연속 달성 일수

    model_config = {"from_attributes": True}
