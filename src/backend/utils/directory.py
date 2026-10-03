"""Filesystem helpers."""

from pathlib import Path


def ensure_dir(dir: str | Path) -> Path:
    """Create a directory if needed and return it."""
    path = Path(dir)
    path.mkdir(parents=True, exist_ok=True)
    return path
