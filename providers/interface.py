from abc import ABC, abstractmethod

from pydantic import BaseModel


class LLMResponse(BaseModel):
    content: str
    model: str
    tokens_used: int = 0


class Provider(ABC):
    name: str = ""
    model: str = ""

    @abstractmethod
    async def generate(self, prompt: str, **kwargs) -> LLMResponse:
        ...
