"""JSON store for prompt layouts."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
LAYOUTS_PATH = ROOT / "data" / "configuration" / "layouts.json"


def read_layouts() -> list[dict[str, Any]]:
    """Return every stored prompt layout."""
    LAYOUTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not LAYOUTS_PATH.exists():
        return []
    data = json.loads(LAYOUTS_PATH.read_text(encoding="utf-8"))
    layouts = data.get("layouts")
    return layouts if isinstance(layouts, list) else []


def write_layouts(layouts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Replace the layouts file and return the saved list."""
    LAYOUTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    LAYOUTS_PATH.write_text(json.dumps({"layouts": layouts}, indent=2) + "\n", encoding="utf-8")
    return layouts


def upsert_layout(layout: dict[str, Any]) -> list[dict[str, Any]]:
    """Insert or replace one layout."""
    layouts = read_layouts()
    layout_id = str(layout.get("id") or "").strip()
    incoming = dict(layout)
    incoming.pop("builtin", None)
    for index, entry in enumerate(layouts):
        if entry.get("id") != layout_id:
            continue
        layouts[index] = incoming
        return write_layouts(layouts)
    layouts.append(incoming)
    return write_layouts(layouts)


def delete_layout(layout_id: str) -> list[dict[str, Any]]:
    """Remove one layout. Keep at least one entry."""
    layouts = read_layouts()
    chosen = next((entry for entry in layouts if entry.get("id") == layout_id), None)
    if chosen is None:
        raise KeyError(layout_id)
    if len(layouts) <= 1:
        raise ValueError("Keep at least one layout")
    layouts = [entry for entry in layouts if entry.get("id") != layout_id]
    return write_layouts(layouts)
