from fastapi import WebSocket
import asyncio
from contextlib import asynccontextmanager

connections: set[WebSocket] = set()
_jobs: dict[str, asyncio.Event] = {}
_pending: set[str] = set()


async def connect(ws: WebSocket):
    """Accept and register a new WebSocket client."""
    await ws.accept()
    connections.add(ws)
    print(f"[WS] Client connected. Total = {len(connections)}")


def disconnect(ws: WebSocket):
    """Unregister a WebSocket client."""
    connections.discard(ws)
    print(f"[WS] Client disconnected. Total = {len(connections)}")


async def broadcast(event: dict):
    """Send one event to every connected client and prune dead sockets."""
    # print(f"[WS] Broadcasting to {len(connections)} clients")

    for ws in list(connections):
        try:
            await ws.send_json(event)
        except Exception as e:
            print(f"[WS] send failed: {e}")
            connections.discard(ws)


@asynccontextmanager
async def start_execution(key: str):
    """Register a chat job and yield its stop event until the handler finishes."""
    event = asyncio.Event()
    if key in _pending:
        _pending.discard(key)
        event.set()
    _jobs[key] = event
    try:
        yield event
    finally:
        _jobs.pop(key, None)
        _pending.discard(key)


def stop_execution(key: str) -> None:
    """Abort the in-flight job, even if create_chat has not registered it yet."""
    if not key:
        return
    event = _jobs.get(key)
    if event is not None:
        event.set()
        return
    _pending.add(key)
