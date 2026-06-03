import logging
import logging.handlers
from pathlib import Path


def setup_logging(
    log_path: Path,
    level: str = "INFO",
    max_bytes: int = 5 * 1024 * 1024,
    backup_count: int = 3,
) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger("music_copilot")
    logger.setLevel(level)

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-5s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    file_handler = logging.handlers.RotatingFileHandler(
        log_path,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    stdout_handler = logging.StreamHandler()
    stdout_handler.setFormatter(formatter)
    logger.addHandler(stdout_handler)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"music_copilot.{name}")
