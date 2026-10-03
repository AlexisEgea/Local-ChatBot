"""Add, replace, and remove messages inside a conversation."""

from __future__ import annotations

from typing import Any
from utils.timestamp import now_iso

from history.body.conversation import read_conversation, write_conversation
from history.id import get_message_id


def add_message(conversation_id: str, message: dict[str, Any]) -> dict[str, Any]:
    """Append one message to a saved conversation."""
    payload = read_conversation(conversation_id)
    messages = list(payload.get("messages") or [])
    messages.append(get_message_id(message))
    payload["messages"] = messages
    payload["updated_at"] = now_iso()
    return write_conversation(payload)


def update_message(conversation_id: str, message_id: str, message: dict[str, Any]) -> dict[str, Any]:
    """Update one message by id, keeping the rest of the conversation."""
    payload = read_conversation(conversation_id)
    messages = list(payload.get("messages") or [])
    updated = []
    found = False
    for existing in messages:
        if existing.get("id") != message_id:
            updated.append(existing)
            continue
        found = True
        body = {key: value for key, value in message.items() if key != "id"}
        updated.append({**existing, **body, "id": message_id})
    if not found:
        raise ValueError("Message not found")
    payload["messages"] = updated
    payload["updated_at"] = now_iso()
    return write_conversation(payload)


def delete_message(conversation_id: str, message_id: str) -> dict[str, Any]:
    """Remove one message by id from a saved conversation."""
    payload = read_conversation(conversation_id)
    messages = list(payload.get("messages") or [])
    updated = [entry for entry in messages if entry.get("id") != message_id]
    if len(updated) == len(messages):
        raise ValueError("Message not found")
    payload["messages"] = updated
    payload["updated_at"] = now_iso()
    return write_conversation(payload)
