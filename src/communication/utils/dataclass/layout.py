"""Pydantic models for prompt layout HTTP requests."""

from pydantic import BaseModel, Field


class LayoutField(BaseModel):
    """One named prompt field and its chat role."""

    name: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    placeholder: str = ""
    role: str = Field(..., pattern="^(system|user)$")
    rows: int = 2


class LayoutBody(BaseModel):
    """One prompt layout saved in data/configuration/layouts.json."""

    id: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1)
    description: str = ""
    fields: list[LayoutField] = Field(..., min_length=1)
