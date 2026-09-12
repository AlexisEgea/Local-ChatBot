"""FastAPI app: chat endpoint, websocket hub, and static frontend."""

import asyncio
import traceback
from contextlib import asynccontextmanager
from pathlib import Path
import sys
from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Backend helpers (llm_client) live under backend/model.
BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from communication.ws_management.event_queue import event_queue
from communication.ws_management.ws_manager import broadcast, connect, disconnect
from history.store import (
    create_conversation,
    delete_conversation,
    list_conversations,
    read_conversation,
    set_title,
    update_conversation,
)
from history.titles import generate_title
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


class HistoryMessage(BaseModel):
    """One saved chat turn."""

    role: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)


class HistoryRequest(BaseModel):
    """Conversation body written to data/history."""

    messages: list[HistoryMessage] = Field(..., min_length=1)
    id: str | None = None
    refine_title: bool = False


class HistoryResponse(BaseModel):
    """Identifiers returned after a save."""

    id: str
    title: str


class HistoryListItem(BaseModel):
    """One row in the History panel."""

    id: str
    title: str
    updated_at: str


class HistoryDetail(BaseModel):
    """Full saved conversation opened from History."""

    id: str
    title: str
    messages: list[HistoryMessage]


class HistoryTitleRequest(BaseModel):
    """Manual rename of a saved conversation."""

    title: str = Field(..., min_length=1, max_length=60)


async def generated_title(messages: list[dict[str, str]]) -> str:
    """Run the small title LLM call and return cleaned text, or an empty string."""
    try:
        return await asyncio.to_thread(generate_title, messages)
    except Exception:
        traceback.print_exc()
        return ""


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


@app.post("/api/history", response_model=HistoryResponse)
async def create_history(payload: HistoryRequest) -> HistoryResponse:
    """Create a history file and wait for a title from the first exchange."""
    messages = [message.model_dump() for message in payload.messages]
    try:
        saved = create_conversation(messages, payload.id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    title = await generated_title(messages)
    if title:
        saved = set_title(saved["id"], title)
    return HistoryResponse(id=saved["id"], title=saved["title"])


@app.get("/api/history", response_model=list[HistoryListItem])
async def get_history() -> list[HistoryListItem]:
    """List saved conversations for the History panel."""
    return [HistoryListItem(**item) for item in list_conversations()]


@app.get("/api/history/{conversation_id}", response_model=HistoryDetail)
async def get_history_item(conversation_id: str) -> HistoryDetail:
    """Return one saved conversation so the UI can reopen it."""
    try:
        saved = read_conversation(conversation_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Conversation not found") from error

    return HistoryDetail(
        id=saved["id"],
        title=saved.get("title", "New chat"),
        messages=saved.get("messages", []),
    )


@app.put("/api/history/{conversation_id}", response_model=HistoryResponse)
async def replace_history(conversation_id: str, payload: HistoryRequest) -> HistoryResponse:
    """Overwrite messages; optionally generate a replacement title in the background."""
    messages = [message.model_dump() for message in payload.messages]
    try:
        saved = update_conversation(conversation_id, messages)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Conversation not found") from error

    if payload.refine_title:
        title = await generated_title(messages)
        if title:
            saved = set_title(saved["id"], title)

    return HistoryResponse(id=saved["id"], title=saved["title"])


@app.patch("/api/history/{conversation_id}", response_model=HistoryResponse)
async def rename_history(conversation_id: str, payload: HistoryTitleRequest) -> HistoryResponse:
    """Rename a saved conversation title."""
    try:
        saved = set_title(conversation_id, payload.title)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Conversation not found") from error

    return HistoryResponse(id=saved["id"], title=saved["title"])


@app.delete("/api/history/{conversation_id}")
async def remove_history(conversation_id: str) -> dict[str, str]:
    """Delete a saved conversation file."""
    try:
        delete_conversation(conversation_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Conversation not found") from error

    return {"status": "deleted"}


@app.get("/")
async def serve_index() -> FileResponse:
    """Serve the chat UI."""
    return FileResponse(FRONTEND_DIR / "index.html")


# Static assets only — do not mount at "/" or GET /api/history/{id} is swallowed.
app.mount("/style", StaticFiles(directory=str(FRONTEND_DIR / "style")), name="style")
app.mount("/script", StaticFiles(directory=str(FRONTEND_DIR / "script")), name="script")
