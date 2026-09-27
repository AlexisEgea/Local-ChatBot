"""Read and write API keys in infra/env."""

from __future__ import annotations

import os
from dotenv import load_dotenv
from pathlib import Path

from api_key.constant import API_KEY_FIELDS


def env_path() -> Path:
    """Return the infra/env file under the repo root."""
    for parent in Path(__file__).resolve().parents:
        infra = parent / "infra"
        if (infra / "env").is_file() or infra.is_dir():
            return infra / "env"
    return Path(__file__).resolve().parents[3] / "infra" / "env"


def list_api_keys() -> list[dict[str, str]]:
    """Return each known API key id, label, and current value."""
    load_dotenv(env_path())
    keys = []
    for field in API_KEY_FIELDS:
        keys.append(
            {
                "id": field["id"],
                "label": field["label"],
                "value": os.getenv(field["id"], ""),
            }
        )
    return keys


def save_api_keys(updates: dict[str, str]) -> list[dict[str, str]]:
    """Write the given keys into infra/env and the process environment."""
    path = env_path()
    allowed = {field["id"] for field in API_KEY_FIELDS}
    payload = {key: value for key, value in updates.items() if key in allowed}
    lines = path.read_text(encoding="utf-8").splitlines() if path.is_file() else []
    seen: set[str] = set()
    next_lines: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in line:
            next_lines.append(line)
            continue
        key, _, _rest = line.partition("=")
        key = key.strip()
        if key in payload:
            next_lines.append(f"{key}={payload[key]}")
            seen.add(key)
            continue
        next_lines.append(line)
    for key, value in payload.items():
        if key not in seen:
            next_lines.append(f"{key}={value}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(next_lines) + "\n", encoding="utf-8")
    for key, value in payload.items():
        os.environ[key] = value
    return list_api_keys()
