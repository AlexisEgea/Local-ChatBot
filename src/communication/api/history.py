"""History endpoints: create, list, open, rename, and delete saved chats."""

import asyncio
import traceback
from pathlib import Path
import sys

from fastapi import APIRouter, HTTPException

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from history.body.message import add_message, delete_message, update_message
from history.body.conversation import (
    create_conversation,
    delete_conversation,
    list_conversations,
    read_conversation,
)
from history.title import generate_title, set_title
from communication.utils.dataclass.history import (
    HistoryDetail,
    HistoryListItem,
    HistoryMessage,
    HistoryMessageAppend,
    HistoryMessageResult,
    HistoryRequest,
    HistoryResponse,
    HistoryTitleRequest,
)

router = APIRouter()


async def generated_title(messages: list[dict[str, str]]) -> str:
    """Run the small title LLM call and return cleaned text, or an empty string."""
    try:
        return await asyncio.to_thread(generate_title, messages)
    except Exception:
        traceback.print_exc()
        return ""


def stored_fields(message: HistoryMessage) -> dict:
    """Drop a client message id; the backend assigns ids."""
    data = message.model_dump(exclude_none=True)
    data.pop("id", None)
    return data


@router.post("/api/history", response_model=HistoryDetail)
async def create_history(payload: HistoryRequest) -> HistoryDetail:
    """Create a history file and wait for a title from the first exchange."""
    messages = [stored_fields(message) for message in payload.messages]
    try:
        saved = create_conversation(messages, payload.id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    title = await generated_title(messages)
    if title:
        saved = set_title(saved["id"], title)
    return HistoryDetail(
        id=saved["id"],
        title=saved["title"],
        messages=saved.get("messages", []),
    )


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


@router.post("/api/history/{conversation_id}/messages", response_model=HistoryMessageResult)
async def append_history_message(conversation_id: str, payload: HistoryMessageAppend) -> HistoryMessageResult:
    """Append one message; optionally regenerate the title."""
    try:
        saved = add_message(conversation_id, stored_fields(payload.message))
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Conversation not found") from error

    if payload.refine_title:
        title = await generated_title(saved.get("messages", []))
        if title:
            saved = set_title(saved["id"], title)

    return HistoryMessageResult(
        id=saved["id"],
        title=saved["title"],
        message=saved["messages"][-1],
    )


@router.put("/api/history/{conversation_id}/messages/{message_id}", response_model=HistoryMessageResult)
async def update_history_message(
    conversation_id: str,
    message_id: str,
    payload: HistoryMessage,
) -> HistoryMessageResult:
    """Update one message; the path id is the only client-supplied message id."""
    try:
        saved = update_message(conversation_id, message_id, stored_fields(payload))
    except ValueError as error:
        status = 404 if str(error) == "Message not found" else 400
        raise HTTPException(status_code=status, detail=str(error)) from error
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Conversation not found") from error

    updated = next(entry for entry in saved.get("messages", []) if entry.get("id") == message_id)
    return HistoryMessageResult(id=saved["id"], title=saved["title"], message=updated)


@router.delete("/api/history/{conversation_id}/messages/{message_id}", response_model=HistoryResponse)
async def remove_history_message(conversation_id: str, message_id: str) -> HistoryResponse:
    """Delete one message by id."""
    try:
        saved = delete_message(conversation_id, message_id)
    except ValueError as error:
        status = 404 if str(error) == "Message not found" else 400
        raise HTTPException(status_code=status, detail=str(error)) from error
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Conversation not found") from error

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
