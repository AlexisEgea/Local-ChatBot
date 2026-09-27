"""Chat endpoint: send the conversation and return the assistant reply."""

import asyncio
import traceback
from functools import partial
from pathlib import Path
import sys

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from communication.ws_management.ws_manager import start_execution

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from model.registry import get_resolved_provider

router = APIRouter()


def _silence_task(task: asyncio.Task) -> None:
    """Drop the result of a background complete_chat thread after a stop."""
    if not task.cancelled():
        task.exception()


class GenerationStopped(Exception):
    """Raised when the user stops an in-flight reply."""


class ChatMessage(BaseModel):
    """One turn in the conversation sent by the frontend."""

    role: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    """Full history required to generate the next assistant reply."""

    messages: list[ChatMessage] = Field(..., min_length=1)
    model: str | None = None
    settings: dict[str, float | int | str] | None = None
    key: str | None = None


class ChatResponse(BaseModel):
    """Assistant text returned to the UI."""

    content: str


async def _complete_or_stop(payload: ChatRequest) -> str:
    """Run the provider, or abort as soon as a matching execution stop arrives."""
    provider, model_id = get_resolved_provider(payload.model)
    worker = asyncio.create_task(
        asyncio.to_thread(
            partial(
                provider.complete_chat,
                [message.model_dump() for message in payload.messages],
                model=model_id,
                settings=payload.settings,
            )
        )
    )
    key = payload.key or ""
    if not key:
        return await worker

    async with start_execution(key) as stop_event:
        stopper = asyncio.create_task(stop_event.wait())
        done, pending = await asyncio.wait(
            {worker, stopper},
            return_when=asyncio.FIRST_COMPLETED,
        )
        if worker in done:
            if stopper in pending:
                stopper.cancel()
                try:
                    await stopper
                except asyncio.CancelledError:
                    pass
            return worker.result()
        worker.add_done_callback(_silence_task)
        raise GenerationStopped()


@router.post("/api/chat", response_model=ChatResponse)
async def create_chat(payload: ChatRequest) -> ChatResponse:
    """Send the conversation to the selected provider and return the reply."""
    try:
        content = await _complete_or_stop(payload)
    except GenerationStopped:
        return ChatResponse(content="Stopped by user")
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=str(error)) from error

    return ChatResponse(content=content)
