from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://floorsight:floorsight@localhost:5432/floorsight"
    secret_key: str = "dev-only-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    cors_origins: str = "http://localhost:5173"

    class Config:
        env_file = ".env"

    @property
    def sqlalchemy_url(self) -> str:
        url = self.database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg://", 1)
        return url


settings = Settings()