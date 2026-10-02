"""Prompt layout endpoints: list, save, and delete entries in data/configuration/layouts.json."""

import asyncio
import traceback
from pathlib import Path
import sys

from fastapi import APIRouter, HTTPException

from communication.utils.dataclass.layout import LayoutBody

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from layout.store import delete_layout, read_layouts, upsert_layout

router = APIRouter()


@router.get("/api/layouts")
async def get_layouts() -> dict:
    """Return every prompt layout from data/configuration/layouts.json."""
    try:
        layouts = await asyncio.to_thread(read_layouts)
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(error) or error.__class__.__name__) from error
    return {"layouts": layouts}


@router.put("/api/layouts")
async def put_layout(payload: LayoutBody) -> dict:
    """Create or update one custom layout."""
    try:
        layouts = await asyncio.to_thread(upsert_layout, payload.model_dump())
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(error) or error.__class__.__name__) from error
    return {"layouts": layouts}


@router.delete("/api/layouts/{layout_id}")
async def remove_layout(layout_id: str) -> dict:
    """Delete one custom layout."""
    try:
        layouts = await asyncio.to_thread(delete_layout, layout_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Layout not found") from None
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(error) or error.__class__.__name__) from error
    return {"layouts": layouts}
