"""JSON conversation files stored under data/history/."""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from utils.directory import ensure_dir

ROOT = Path(__file__).resolve().parents[3]
HISTORY_DIR = ROOT / "data" / "history"
SAFE_ID = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}(?:-[0-9]+)?$")
FALLBACK_TITLE = "New chat"
TITLE_MAX_LENGTH = 60


def new_conversation_id() -> str:
    """Build a unique id from the local start time."""
    ensure_dir(HISTORY_DIR)
    stamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    candidate = stamp
    suffix = 1
    while conversation_path(candidate).exists():
        candidate = f"{stamp}-{suffix}"
        suffix += 1
    return candidate


def conversation_path(conversation_id: str) -> Path:
    """Resolve a conversation id to its JSON path."""
    if not SAFE_ID.match(conversation_id):
        raise ValueError("Invalid conversation id")
    return ensure_dir(HISTORY_DIR) / f"{conversation_id}.json"


def now_iso() -> str:
    """Return a local timestamp for created_at / updated_at."""
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def write_conversation(payload: dict[str, Any]) -> dict[str, Any]:
    """Write a conversation dict to disk and return it."""
    path = conversation_path(payload["id"])
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return payload


def read_conversation(conversation_id: str) -> dict[str, Any]:
    """Load a saved conversation or raise FileNotFoundError."""
    path = conversation_path(conversation_id)
    if not path.is_file():
        raise FileNotFoundError(conversation_id)
    return json.loads(path.read_text(encoding="utf-8"))


def create_conversation(messages: list[dict[str, str]], conversation_id: str | None = None) -> dict[str, Any]:
    """Create a history file. Optional id is the conversation start time."""
    created = now_iso()
    payload = {
        "id": conversation_id if conversation_id and SAFE_ID.match(conversation_id) else new_conversation_id(),
        "title": FALLBACK_TITLE,
        "created_at": created,
        "updated_at": created,
        "messages": messages,
    }
    if conversation_path(payload["id"]).exists():
        payload["id"] = new_conversation_id()
    return write_conversation(payload)


def list_conversations() -> list[dict[str, str]]:
    """Return saved chats newest-first, without message bodies."""
    items: list[dict[str, str]] = []
    for path in ensure_dir(HISTORY_DIR).glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        items.append(
            {
                "id": data.get("id", path.stem),
                "title": data.get("title", FALLBACK_TITLE),
                "updated_at": data.get("updated_at", ""),
            }
        )
    items.sort(key=lambda item: item["updated_at"], reverse=True)
    return items


def update_conversation(conversation_id: str, messages: list[dict[str, str]]) -> dict[str, Any]:
    """Replace messages in an existing file, keeping id and title."""
    payload = read_conversation(conversation_id)
    payload["messages"] = messages
    payload["updated_at"] = now_iso()
    return write_conversation(payload)


def set_title(conversation_id: str, title: str) -> dict[str, Any]:
    """Update only the generated title."""
    payload = read_conversation(conversation_id)
    cleaned = " ".join(title.split()).strip(" \"'")
    if not cleaned:
        raise ValueError("Title cannot be empty")
    payload["title"] = cleaned[:TITLE_MAX_LENGTH]
    payload["updated_at"] = now_iso()
    return write_conversation(payload)


def delete_conversation(conversation_id: str) -> None:
    """Remove a saved conversation file."""
    path = conversation_path(conversation_id)
    if not path.is_file():
        raise FileNotFoundError(conversation_id)
    path.unlink()
