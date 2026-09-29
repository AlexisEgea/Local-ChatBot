"""Pydantic models for execution HTTP requests."""

from pydantic import BaseModel, Field


class ExecutionStopRequest(BaseModel):
    """Identifies the chat request the user wants to abort."""

    key: str = Field(..., min_length=1)
