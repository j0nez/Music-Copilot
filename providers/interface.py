from abc import ABC, abstractmethod

from pydantic import BaseModel


class LLMResponse(BaseModel):
    content: str
    model: str
    provider: str = ""
    tokens_used: int = 0


class RateLimitError(Exception):
    """Raised when a provider returns 429. Triggers auto-failover."""


class ProviderError(Exception):
    """Raised on non-429 provider failures. Does NOT trigger failover."""


class Provider(ABC):
    name: str = ""
    model: str = ""
    available_models: list[str] = []
    api_key_required: bool = True

    @abstractmethod
    async def generate(self, prompt: str, **kwargs) -> LLMResponse:
        ...
