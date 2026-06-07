import asyncio
import logging
from typing import Any, Awaitable, Callable

logger = logging.getLogger("music_copilot.event_bus")

Handler = Callable[..., Awaitable[None]]


class EventBus:
    def __init__(self) -> None:
        self._handlers: dict[str, list[Handler]] = {}

    def on(self, event: str, handler: Handler) -> None:
        if event not in self._handlers:
            self._handlers[event] = []
        self._handlers[event].append(handler)

    def off(self, event: str, handler: Handler) -> None:
        if event in self._handlers:
            self._handlers[event] = [
                h for h in self._handlers[event] if h is not handler
            ]

    async def emit(self, event: str, **data: Any) -> None:
        handlers = self._handlers.get(event, [])
        if not handlers:
            return
        tasks = [asyncio.create_task(handler(**data)) for handler in handlers]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error("Event handler for '%s' failed: %s", event, result)

    def get_events(self) -> list[str]:
        return list(self._handlers.keys())

    def handlers_for(self, event: str) -> int:
        return len(self._handlers.get(event, []))


event_bus = EventBus()
