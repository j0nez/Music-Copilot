import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any

from providers.interface import LLMResponse, Provider, ProviderError, RateLimitError

logger = logging.getLogger("music_copilot.providers")

_PROBE_INTERVAL = 300  # seconds between re-probes of higher-priority providers


@dataclass
class _ProviderConfig:
    api_key: str
    model: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)
    instance: Provider | None = None


_registry: dict[str, type[Provider]] = {}
_configs: dict[str, _ProviderConfig] = {}
_priority: list[str] = []
_active_idx: int = 0
_probing: bool = False
_probe_task: asyncio.Task | None = None


def register_provider(name: str, cls: type[Provider]) -> None:
    _registry[name] = cls


def get_provider(name: str) -> type[Provider] | None:
    return _registry.get(name)


def list_providers() -> list[str]:
    return list(_registry.keys())


def configure(name: str, api_key: str, model: str | None = None, **kwargs: Any) -> Provider:
    cls = _registry.get(name)
    if cls is None:
        raise ValueError(f"Unknown provider: {name}. Available: {list(_registry.keys())}")
    cfg = _ProviderConfig(api_key=api_key, model=model, extra=kwargs)
    cfg.instance = cls(api_key=api_key, model=model or cls.model, **kwargs)
    _configs[name] = cfg
    if name not in _priority:
        _priority.append(name)
    return cfg.instance


def configure_priority(priority: list[str]) -> None:
    global _active_idx
    unknown = [p for p in priority if p not in _configs]
    if unknown:
        raise ValueError(f"Providers not configured: {unknown}. Call configure() first.")
    _priority[:] = priority
    _active_idx = 0


def get_provider_info() -> list[dict[str, Any]]:
    result = []
    for name, cls in _registry.items():
        cfg = _configs.get(name)
        result.append({
            "name": name,
            "configured": cfg is not None,
            "model": cfg.model if cfg else None,
            "available_models": cls.available_models if hasattr(cls, "available_models") else [],
            "healthy": False,
            "key_hint": f"...{cfg.api_key[-4:]}" if cfg and cfg.api_key else None,
        })
    return result


def get_priority() -> list[str]:
    return list(_priority)


async def generate(prompt: str, **kwargs: Any) -> LLMResponse:
    global _active_idx

    if not _priority:
        raise RuntimeError("No AI providers configured. Call configure() first.")

    last_error: Exception | None = None
    start_idx = _active_idx

    for offset in range(len(_priority)):
        idx = (start_idx + offset) % len(_priority)
        name = _priority[idx]
        cfg = _configs.get(name)
        if cfg is None or cfg.instance is None:
            continue

        provider = cfg.instance
        try:
            response = await provider.generate(prompt, **kwargs)
            _active_idx = idx
            _schedule_reprobe()
            return response
        except RateLimitError:
            logger.warning("Provider %s rate-limited, trying next", name)
            last_error = RateLimitError(f"All providers rate-limited. Last tried: {name}")
            continue
        except ProviderError:
            logger.warning("Provider %s returned an error, trying next", name)
            last_error = ProviderError(f"All providers failed. Last tried: {name}")
            continue

    raise last_error or RuntimeError("No providers available")


def _schedule_reprobe() -> None:
    global _probe_task
    if _probe_task is not None and not _probe_task.done():
        return
    if _active_idx == 0:
        return

    async def _probe() -> None:
        global _probing, _active_idx
        if _probing:
            return
        _probing = True
        try:
            await asyncio.sleep(_PROBE_INTERVAL)
            for i in range(_active_idx):
                name = _priority[i]
                cfg = _configs.get(name)
                if cfg is None or cfg.instance is None:
                    continue
                try:
                    await cfg.instance.generate("ping", _probe=True)
                    _active_idx = i
                    logger.info("Re-probe successful: switched back to %s", name)
                    return
                except (RateLimitError, ProviderError):
                    logger.debug("Re-probe failed for %s, staying on current", name)
                    continue
        finally:
            _probing = False

    _probe_task = asyncio.create_task(_probe())
