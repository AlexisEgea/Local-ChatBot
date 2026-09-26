"""Hugging Face model repo: generation_config, tags, and other Hub files."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request


def repo_id(model_id: str) -> str:
    """Strip a `:provider` suffix so Hub files can be loaded."""
    return model_id.split(":", 1)[0]


def http_json(url: str) -> dict | None:
    """GET a JSON object, or None when the request fails."""
    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {os.getenv('HF_TOKEN', '')}",
            "User-Agent": "local-chatbot",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode())
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError):
        return None
    return payload if isinstance(payload, dict) else None


def repo_json(repo: str, filename: str) -> dict | None:
    """Download a JSON file from the model repo, or None when it is missing."""
    path = urllib.parse.quote(repo, safe="/")
    return http_json(f"https://huggingface.co/{path}/resolve/main/{filename}")


def repo_tags(repo: str) -> list[str]:
    """Return Hub tags used to detect capabilities such as reasoning."""
    info = http_json(f"https://huggingface.co/api/models/{repo}")
    tags = info.get("tags") if info else None
    return [str(tag) for tag in tags] if tags else []
