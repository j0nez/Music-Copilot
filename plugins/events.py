from typing import Any, Awaitable, Callable

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
        for handler in self._handlers.get(event, []):
            await handler(**data)

    def get_events(self) -> list[str]:
        return list(self._handlers.keys())

    def handlers_for(self, event: str) -> int:
        return len(self._handlers.get(event, []))


event_bus = EventBus()
