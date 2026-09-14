"""Chat endpoint: send the conversation and return the assistant reply."""

import asyncio
import traceback
from functools import partial
from pathlib import Path
import sys

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from model.chat_completion_response import complete_chat
from model.parameters.list_model_parameters import sanitize_settings

router = APIRouter()


class ChatMessage(BaseModel):
    """One turn in the conversation sent by the frontend."""

    role: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    """Full history required to generate the next assistant reply."""

    messages: list[ChatMessage] = Field(..., min_length=1)
    model: str | None = None
    settings: dict[str, float | int | str] | None = None


class ChatResponse(BaseModel):
    """Assistant text returned to the UI."""

    content: str


@router.post("/api/chat", response_model=ChatResponse)
async def create_chat(payload: ChatRequest) -> ChatResponse:
    """Send the conversation to Hugging Face Inference and return the reply."""
    try:
        model_id, settings = sanitize_settings(payload.model, payload.settings)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    try:
        content = await asyncio.to_thread(
            partial(
                complete_chat,
                [message.model_dump() for message in payload.messages],
                model=model_id,
                settings=settings,
            )
        )
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=str(error)) from error

    return ChatResponse(content=content)
