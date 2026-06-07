from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent


class Settings(BaseSettings):
    app_name: str = "Music Copilot"
    app_version: str = "0.1.0"
    debug: bool = True

    host: str = "127.0.0.1"
    port: int = 8000

    cors_origins: list[str] = ["http://localhost:5173"]

    db_path: Path = PROJECT_ROOT / "data" / "db" / "music_copilot.db"

    ai_provider: str = "groq"
    ai_model: str = "mixtral-8x7b-32768"
    ai_api_key: str = ""
    ai_provider_priority: str = ""

    log_path: Path = PROJECT_ROOT / "data" / "logs" / "app.log"
    log_level: str = "DEBUG"

    data_dir: Path = PROJECT_ROOT / "data"
    upload_dir: Path = PROJECT_ROOT / "data" / "uploads"
    export_dir: Path = PROJECT_ROOT / "data" / "exports"

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
    )


settings = Settings()
