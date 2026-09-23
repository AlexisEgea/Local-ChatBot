"""Pydantic models for history HTTP requests and responses."""

from typing import Any

from pydantic import BaseModel, Field


class HistoryMessage(BaseModel):
    """One saved chat turn."""

    role: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    layout: str | None = None
    values: dict[str, str] | None = None
    source: str | None = None
    model_info: dict[str, Any] | None = None
    id: str | None = None


class HistoryRequest(BaseModel):
    """Conversation body written to data/history."""

    messages: list[HistoryMessage] = Field(..., min_length=1)
    id: str | None = None
    refine_title: bool = False


class HistoryResponse(BaseModel):
    """Identifiers returned after a save."""

    id: str
    title: str


class HistoryMessageResult(BaseModel):
    """Conversation identifiers plus the message that was written."""

    id: str
    title: str
    message: HistoryMessage


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
    """Manual rename of a saved conversation title."""

    title: str = Field(..., min_length=1, max_length=60)


class HistoryMessageAppend(BaseModel):
    """One new message appended to a saved conversation."""

    message: HistoryMessage
    refine_title: bool = False
