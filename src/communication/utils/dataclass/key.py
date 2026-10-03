"""Pydantic models for API key HTTP requests."""

from pydantic import BaseModel, Field


class ApiKeyValue(BaseModel):
    """One key edited in the popup."""

    id: str = Field(..., min_length=1)
    value: str = ""
