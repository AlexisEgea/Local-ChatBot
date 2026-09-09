"""FastAPI app: chat endpoint, websocket hub, and static frontend."""

import asyncio
import traceback
from contextlib import asynccontextmanager
from pathlib import Path
import sys
from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Backend helpers (llm_client) live under backend/model.
BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from communication.ws_management.event_queue import event_queue
from communication.ws_management.ws_manager import broadcast, connect, disconnect
from model.llm_client import complete_chat

FRONTEND_DIR = Path(__file__).resolve().parents[1] / "frontend"


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


app = FastAPI(title="Local ChatBot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    """One turn in the conversation sent by the frontend."""

    role: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    """Full history required to generate the next assistant reply."""

    messages: list[ChatMessage] = Field(..., min_length=1)


class ChatResponse(BaseModel):
    """Assistant text returned to the UI."""

    content: str


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Keep a WebSocket connection open for live event streaming."""
    await connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        disconnect(websocket)


@app.post("/api/chat", response_model=ChatResponse)
async def create_chat(payload: ChatRequest) -> ChatResponse:
    """Send the conversation to Hugging Face Inference and return the reply."""
    try:
        # Hugging Face SDK calls are blocking, so they run in a worker thread.
        content = await asyncio.to_thread(
            complete_chat,
            [message.model_dump() for message in payload.messages],
        )
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=str(error)) from error

    return ChatResponse(content=content)


# Serve index.html and the style/script folders from src/frontend.
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
