import pytest

from plugins.events import EventBus

pytestmark = pytest.mark.asyncio


async def test_on_emit_receives_data():
    bus = EventBus()
    received = []

    async def handler(**data):
        received.append(data)

    bus.on("test.event", handler)
    await bus.emit("test.event", foo=1, bar="baz")

    assert len(received) == 1
    assert received[0] == {"foo": 1, "bar": "baz"}


async def test_off_removes_handler():
    bus = EventBus()
    received = []

    async def handler(**data):
        received.append(data)

    bus.on("test.event", handler)
    bus.off("test.event", handler)
    await bus.emit("test.event", foo=1)

    assert len(received) == 0


async def test_emit_unknown_event_does_not_crash():
    bus = EventBus()
    await bus.emit("nonexistent.event")
    assert True


async def test_multiple_handlers_for_same_event():
    bus = EventBus()
    results = {"a": [], "b": []}

    async def handler_a(**data):
        results["a"].append(data["x"])

    async def handler_b(**data):
        results["b"].append(data["x"])

    bus.on("shared.event", handler_a)
    bus.on("shared.event", handler_b)
    await bus.emit("shared.event", x=42)

    assert results["a"] == [42]
    assert results["b"] == [42]


async def test_get_events_returns_registered_events():
    bus = EventBus()

    async def h(**data):
        pass

    bus.on("event.a", h)
    bus.on("event.b", h)

    events = bus.get_events()
    assert sorted(events) == ["event.a", "event.b"]


async def test_handlers_for_returns_correct_count():
    bus = EventBus()

    async def h1(**data):
        pass

    async def h2(**data):
        pass

    bus.on("event", h1)
    bus.on("event", h2)

    assert bus.handlers_for("event") == 2
    assert bus.handlers_for("unknown") == 0
