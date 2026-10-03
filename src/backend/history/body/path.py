"""JSON paths for saved conversations."""

from __future__ import annotations

from pathlib import Path

from utils.directory import ensure_dir

from history.id import CONVERSATION

ROOT = Path(__file__).resolve().parents[4]
HISTORY_DIR = ROOT / "data" / "history"


def conversation_path(conversation_id: str) -> Path:
    """Resolve a conversation id to its JSON path."""
    if not CONVERSATION.match(conversation_id):
        raise ValueError("Invalid conversation id")
    return ensure_dir(HISTORY_DIR) / f"{conversation_id}.json"
