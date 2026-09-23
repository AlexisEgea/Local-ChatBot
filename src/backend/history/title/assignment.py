"""Assign a stored title on a conversation."""

from history.body.conversation import read_conversation, write_conversation
from utils.timestamp import now_iso

TITLE_MAX_LENGTH = 60


def set_title(conversation_id: str, title: str) -> dict:
    """Write the title field on a saved conversation."""
    payload = read_conversation(conversation_id)
    cleaned = " ".join(title.split()).strip(" \"'")
    if not cleaned:
        raise ValueError("Title cannot be empty")
    payload["title"] = cleaned[:TITLE_MAX_LENGTH]
    payload["updated_at"] = now_iso()
    return write_conversation(payload)
