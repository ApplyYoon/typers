from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import settings

# Fly.io 내부 네트워크(flycast)는 SSL 불필요
_connect_args = {"ssl": False} if "flycast" in settings.DATABASE_URL else {}
engine = create_async_engine(settings.DATABASE_URL, echo=False, connect_args=_connect_args)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
