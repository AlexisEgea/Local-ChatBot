"""API key endpoints: list, test, and save keys from infra/env."""

import asyncio
import traceback
from pathlib import Path
import sys

from fastapi import APIRouter, HTTPException

from communication.utils.dataclass.key import ApiKeyValue

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from api_key.check import test_api_key
from api_key.store import list_api_keys, save_api_keys

router = APIRouter()


def _test_one(item: ApiKeyValue) -> bool:
    """Return True when the key is accepted, False otherwise."""
    try:
        test_api_key(item.id, item.value)
    except ValueError:
        return False
    return True


@router.get("/api/keys")
async def get_keys() -> dict:
    """Return API key fields and their current env values."""
    try:
        keys = await asyncio.to_thread(list_api_keys)
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=str(error)) from error
    return {"keys": keys}


@router.post("/api/keys/test")
async def test_one_key(payload: ApiKeyValue) -> dict:
    """Check one key and return whether it is valid."""
    try:
        ok = await asyncio.to_thread(_test_one, payload)
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=str(error)) from error
    return {"ok": ok}


@router.put("/api/keys")
async def put_key(payload: ApiKeyValue) -> dict:
    """Test one key, then write it to infra/env if it is valid."""
    try:
        await asyncio.to_thread(test_api_key, payload.id, payload.value)
        keys = await asyncio.to_thread(save_api_keys, {payload.id: payload.value})
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=str(error)) from error
    return {"keys": keys}
