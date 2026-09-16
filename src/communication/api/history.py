"""History endpoints: create, list, open, rename, and delete saved chats."""

import asyncio
import traceback
from pathlib import Path
import sys

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from history.store import (
    create_conversation,
    delete_conversation,
    list_conversations,
    read_conversation,
    set_title,
    update_conversation,
)
from history.titles import generate_title

router = APIRouter()


class HistoryMessage(BaseModel):
    """One saved chat turn."""

    role: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    layout: str | None = None
    values: dict[str, str] | None = None
    source: str | None = None


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


@router.post("/api/history", response_model=HistoryResponse)
async def create_history(payload: HistoryRequest) -> HistoryResponse:
    """Create a history file and wait for a title from the first exchange."""
    messages = [message.model_dump(exclude_none=True) for message in payload.messages]
    try:
        saved = create_conversation(messages, payload.id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    title = await generated_title(messages)
    if title:
        saved = set_title(saved["id"], title)
    return HistoryResponse(id=saved["id"], title=saved["title"])


@router.get("/api/history", response_model=list[HistoryListItem])
async def get_history() -> list[HistoryListItem]:
    """List saved conversations for the History panel."""
    return [HistoryListItem(**item) for item in list_conversations()]


@router.get("/api/history/{conversation_id}", response_model=HistoryDetail)
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


@router.put("/api/history/{conversation_id}", response_model=HistoryResponse)
async def replace_history(conversation_id: str, payload: HistoryRequest) -> HistoryResponse:
    """Overwrite messages; optionally generate a replacement title in the background."""
    messages = [message.model_dump(exclude_none=True) for message in payload.messages]
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


@router.patch("/api/history/{conversation_id}", response_model=HistoryResponse)
async def rename_history(conversation_id: str, payload: HistoryTitleRequest) -> HistoryResponse:
    """Rename a saved conversation title."""
    try:
        saved = set_title(conversation_id, payload.title)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Conversation not found") from error

    return HistoryResponse(id=saved["id"], title=saved["title"])


@router.delete("/api/history/{conversation_id}")
async def remove_history(conversation_id: str) -> dict[str, str]:
    """Delete a saved conversation file."""
    try:
        delete_conversation(conversation_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Conversation not found") from error

    return {"status": "deleted"}
