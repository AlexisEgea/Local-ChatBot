"""WebSocket hub: live event streaming to connected clients."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, WebSocket

from communication.ws_management.event_queue import event_queue
from communication.ws_management.ws_manager import broadcast, connect, disconnect

router = APIRouter()


async def event_worker() -> None:
    """Continuously forward queued events to connected WebSocket clients."""
    while True:
        event = await event_queue.get()
        await broadcast(event)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start and stop the background broadcaster with the API lifecycle."""
    worker_task = asyncio.create_task(event_worker())
    try:
        yield
    finally:
        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Keep a WebSocket connection open for live event streaming."""
    await connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        disconnect(websocket)
