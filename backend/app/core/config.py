from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7일

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5175"

    # HTTPS 환경(프로덕션)에서 True — secure 쿠키 + SameSite=None 활성화
    HTTPS: bool = False

    @model_validator(mode="after")
    def validate_secret_key(self) -> "Settings":
        if len(self.SECRET_KEY) < 32 or "change-this" in self.SECRET_KEY:
            raise ValueError("SECRET_KEY must be a random string of at least 32 characters")
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()
