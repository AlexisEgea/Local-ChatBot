"""Pydantic models for model catalog HTTP requests."""

from pydantic import BaseModel, Field


class LocalFolderBody(BaseModel):
    """Folder name chosen in the browser directory picker."""

    folder: str = Field(..., min_length=1)
