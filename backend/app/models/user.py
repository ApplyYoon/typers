import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    level: Mapped[int] = mapped_column(Integer, default=0)        # 0~4
    initial_cpm: Mapped[int] = mapped_column(Integer, default=0)  # 레벨테스트 측정값
    rank_score: Mapped[int] = mapped_column(Integer, default=1000) # 배틀 랭크 포인트 (초기값 1000)

    sessions:     Mapped[list["PracticeSession"]] = relationship(back_populates="user")  # noqa: F821
    dictionaries: Mapped[list["Dictionary"]]     = relationship(back_populates="user")  # noqa: F821
    goal:         Mapped[list["UserGoal"]]        = relationship(back_populates="user")  # noqa: F821
