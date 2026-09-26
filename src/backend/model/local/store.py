"""Discover local Hugging Face model folders (paths only)."""

from __future__ import annotations

import os
from pathlib import Path

from model.local.constant import COMPANY_ID, PROVIDER_ID
from model.local.parameter import context_length_from_config, read_folder_json


def project_root() -> Path:
    """Return the repo root that contains infra/env."""
    for parent in Path(__file__).resolve().parents:
        if (parent / "infra" / "env").is_file():
            return parent
    return Path(__file__).resolve().parents[4]


def huggingface_hub_dir() -> Path:
    """Return the Hugging Face hub cache directory."""
    home = os.getenv("HF_HOME")
    if home:
        return Path(home) / "hub"
    return Path.home() / ".cache" / "huggingface" / "hub"


def is_huggingface_folder(path: Path) -> bool:
    """Return True when the folder looks like a Transformers model (config.json)."""
    return path.is_dir() and (path / "config.json").is_file()


def resolve_model_folder(raw: str) -> Path:
    """Resolve a user path and require a Hugging Face config.json."""
    folder = Path(raw.strip()).expanduser().resolve()
    if not is_huggingface_folder(folder):
        raise ValueError("Choose a Hugging Face model folder that contains config.json.")
    return folder


def _hub_names(folder_name: str) -> tuple[str, str]:
    """Parse models--org--name into company and label."""
    body = folder_name.removeprefix("models--")
    parts = body.split("--", 1)
    if len(parts) == 2:
        return parts[0].replace("___", "/"), parts[1].replace("___", "/")
    return COMPANY_ID, body.replace("___", "/")


def entry_from_folder(folder: Path, company: str | None = None) -> dict:
    """Build a catalog row from a folder. Does not load weights."""
    config = read_folder_json(folder, "config.json")
    return {
        "id": str(folder),
        "label": folder.name,
        "provider": PROVIDER_ID,
        "company": company or COMPANY_ID,
        "context_length": context_length_from_config(config),
    }


def discover_hub_models() -> list[dict]:
    """List snapshot folders in the Hugging Face hub cache that have config.json."""
    hub = huggingface_hub_dir()
    if not hub.is_dir():
        return []
    found: list[dict] = []
    for item in sorted(hub.glob("models--*")):
        snapshots = item / "snapshots"
        if not snapshots.is_dir():
            continue
        _company, label = _hub_names(item.name)
        snaps = sorted(
            (path for path in snapshots.iterdir() if path.is_dir()),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )
        for snap in snaps:
            if is_huggingface_folder(snap):
                entry = entry_from_folder(snap)
                entry["label"] = label
                found.append(entry)
                break
    return found


def discover_project_models() -> list[dict]:
    """List Hugging Face folders under the project's models/ directory."""
    root = project_root() / "models"
    if not root.is_dir():
        return []
    found: list[dict] = []
    seen: set[str] = set()
    candidates = [root, *sorted(path for path in root.iterdir() if path.is_dir())]
    for folder in candidates:
        if not is_huggingface_folder(folder):
            continue
        resolved = str(folder.resolve())
        if resolved in seen:
            continue
        seen.add(resolved)
        found.append(entry_from_folder(folder))
    return found


def register_picked_folder(folder_name: str) -> dict:
    """Match a browser-picked folder name to a path on this machine."""
    name = folder_name.strip().strip("/\\")
    if not name:
        raise ValueError("Choose a Hugging Face model folder that contains config.json.")
    matches: list[Path] = []
    seen: set[str] = set()
    for folder, label in _known_folders():
        resolved = str(folder.resolve())
        if resolved in seen:
            continue
        seen.add(resolved)
        if folder.name == name or label == name:
            matches.append(folder)
    if not matches:
        raise ValueError(
            f"Could not find '{name}' in the project's models/ folder or the Hugging Face cache."
        )
    project_models = project_root() / "models"
    matches.sort(key=lambda path: 0 if _is_under(path, project_models) else 1)
    return entry_from_folder(resolve_model_folder(str(matches[0])))


def _is_under(path: Path, root: Path) -> bool:
    """Return True when path is root or a child of root."""
    try:
        path.resolve().relative_to(root.resolve())
    except ValueError:
        return False
    return True


def _known_folders() -> list[tuple[Path, str]]:
    """Yield (folder, display name) from models/ and the hub cache."""
    found: list[tuple[Path, str]] = []
    for entry in discover_project_models():
        found.append((Path(entry["id"]), entry["label"]))
    for entry in discover_hub_models():
        found.append((Path(entry["id"]), entry["label"]))
    return found
