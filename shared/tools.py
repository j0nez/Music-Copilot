from dataclasses import dataclass
from typing import Any, Awaitable, Callable
import json


@dataclass
class Tool:
    name: str
    description: str
    parameters: dict
    handler: Callable[..., Awaitable[Any]]

    def to_openai_tool(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


class ToolRegistry:
    _tools: dict[str, Tool] = {}

    @classmethod
    def register(cls, tool: Tool) -> None:
        cls._tools[tool.name] = tool

    @classmethod
    def get(cls, name: str) -> Tool | None:
        return cls._tools.get(name)

    @classmethod
    def list(cls) -> list[dict]:
        return [t.to_openai_tool() for t in cls._tools.values()]

    @classmethod
    async def call(cls, name: str, arguments: str | dict) -> Any:
        tool = cls.get(name)
        if not tool:
            raise ValueError(f"Unknown tool: {name}")
        if isinstance(arguments, str):
            arguments = json.loads(arguments)
        return await tool.handler(**arguments)
