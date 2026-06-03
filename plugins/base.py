from abc import ABC, abstractmethod

from pydantic import BaseModel


class PluginResult(BaseModel):
    success: bool
    data: dict
    error: str | None = None


class Plugin(ABC):
    name: str = ""
    description: str = ""
    version: str = "0.1.0"

    @abstractmethod
    async def execute(self, **kwargs) -> PluginResult:
        ...
