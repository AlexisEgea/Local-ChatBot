"""Identifiers for saved history: timestamp conversations, uuid messages."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any
from uuid import uuid4

CONVERSATION = re.compile(
    r"^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}(?:-[0-9]+)?$"
)


def get_conversation_id(preferred: str | None = None) -> str:
    """Return a conversation file id (start time). Mint a unique one if needed."""
    if preferred and CONVERSATION.match(preferred):
        return preferred

    from history.body.path import HISTORY_DIR, conversation_path
    from utils.directory import ensure_dir

    ensure_dir(HISTORY_DIR)
    stamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    candidate = stamp
    suffix = 1
    while conversation_path(candidate).exists():
        candidate = f"{stamp}-{suffix}"
        suffix += 1
    return candidate


def get_message_id(record: dict[str, Any]) -> dict[str, Any]:
    """Assign a backend message uuid, ignoring any client-supplied id."""
    return {key: value for key, value in record.items() if key != "id"} | {"id": str(uuid4())}


def fill_message_ids(payload: dict[str, Any]) -> tuple[dict[str, Any], bool]:
    """Give each stored message an id when older files omit one."""
    changed = False
    records = []
    for record in payload.get("messages") or []:
        if record.get("id"):
            records.append(record)
            continue
        records.append(get_message_id(record))
        changed = True
    payload["messages"] = records
    return payload, changed
