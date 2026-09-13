"""Model options endpoint: provider models and per-model generation fields."""

import asyncio
import traceback
from pathlib import Path
import sys

from fastapi import APIRouter, HTTPException, Query

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from model.sources.available_models import list_model_options
from model.parameters.list_model_parameters import list_model_parameters

router = APIRouter()


@router.get("/api/models")
async def get_models() -> dict:
    """Return providers, then companies and models for the Model panel."""
    try:
        return await asyncio.to_thread(list_model_options)
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.get("/api/models/parameters")
async def get_model_parameters(model: str = Query(..., min_length=1)) -> dict:
    """Return the generation parameters that belong to one model."""
    try:
        parameters = await asyncio.to_thread(list_model_parameters, model)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=str(error)) from error
    return {"model": model, "parameters": parameters}
