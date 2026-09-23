"""Timestamp helpers."""

from datetime import datetime


def now_iso() -> str:
    """Return a local timestamp for created_at / updated_at."""
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
