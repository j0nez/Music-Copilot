from typing import Any

from backend.app.core.config import settings
from providers.interface import LLMResponse, Provider

_registry: dict[str, type[Provider]] = {}
_active_provider: Provider | None = None


def register_provider(name: str, cls: type[Provider]) -> None:
    _registry[name] = cls


def get_provider(name: str) -> type[Provider] | None:
    return _registry.get(name)


def list_providers() -> list[str]:
    return list(_registry.keys())


def configure(provider_name: str | None = None, **config: Any) -> Provider:
    global _active_provider
    name = provider_name or settings.ai_provider
    cls = _registry.get(name)
    if cls is None:
        raise ValueError(f"Unknown provider: {name}. Available: {list(_registry.keys())}")
    _active_provider = cls(**config)
    return _active_provider


async def generate(prompt: str, **kwargs: Any) -> LLMResponse:
    global _active_provider
    if _active_provider is None:
        configure()
    if _active_provider is None:
        raise RuntimeError("No AI provider configured")
    return await _active_provider.generate(prompt, **kwargs)
