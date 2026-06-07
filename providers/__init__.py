from typing import Any

from providers.interface import LLMResponse, Provider

_registry: dict[str, type[Provider]] = {}
_active_provider: Provider | None = None


def register_provider(name: str, cls: type[Provider]) -> None:
    _registry[name] = cls


def get_provider(name: str) -> type[Provider] | None:
    return _registry.get(name)


def list_providers() -> list[str]:
    return list(_registry.keys())


def configure(provider_name: str, api_key: str, **config: Any) -> Provider:
    global _active_provider
    cls = _registry.get(provider_name)
    if cls is None:
        raise ValueError(f"Unknown provider: {provider_name}. Available: {list(_registry.keys())}")
    _active_provider = cls(api_key=api_key, **config)
    return _active_provider


async def generate(prompt: str, **kwargs: Any) -> LLMResponse:
    global _active_provider
    if _active_provider is None:
        raise RuntimeError("No AI provider configured. Call configure() first.")
    return await _active_provider.generate(prompt, **kwargs)
