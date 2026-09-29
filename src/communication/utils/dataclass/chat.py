"""Pydantic models for chat HTTP requests and responses."""

from pydantic import BaseModel, Field


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
    """Assistant text returned to the UI, with optional paid-token cost."""

    content: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    input_cost: float | None = None
    output_cost: float | None = None
    cost: float | None = None
