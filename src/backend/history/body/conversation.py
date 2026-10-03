"""Read, write, list, create, and delete a conversation."""

from __future__ import annotations

import json
from typing import Any

from utils.directory import ensure_dir
from utils.timestamp import now_iso

from history.id import fill_message_ids, get_conversation_id, get_message_id
from history.body.path import HISTORY_DIR, conversation_path

FALLBACK_TITLE = "New chat"


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
    payload = json.loads(path.read_text(encoding="utf-8"))
    payload, changed = fill_message_ids(payload)
    if changed:
        return write_conversation(payload)
    return payload


def create_conversation(messages: list[dict[str, str]], conversation_id: str | None = None) -> dict[str, Any]:
    """Create a history file. Optional id is the conversation start time."""
    created = now_iso()
    payload = {
        "id": get_conversation_id(conversation_id),
        "title": FALLBACK_TITLE,
        "created_at": created,
        "updated_at": created,
        "messages": [get_message_id(message) for message in messages],
    }
    if conversation_path(payload["id"]).exists():
        payload["id"] = get_conversation_id()
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


def delete_conversation(conversation_id: str) -> None:
    """Remove a saved conversation file."""
    path = conversation_path(conversation_id)
    if not path.is_file():
        raise FileNotFoundError(conversation_id)
    path.unlink()
