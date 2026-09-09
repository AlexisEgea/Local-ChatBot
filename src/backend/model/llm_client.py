"""Hugging Face Inference client used by the CLI and the chat API."""

import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

ROOT = Path(__file__).resolve().parents[3]
load_dotenv(ROOT / "infra" / "env")


def create_client() -> OpenAI:
    """Build an OpenAI-compatible client pointed at Hugging Face's router."""
    api_key = os.getenv("HF_TOKEN")
    if not api_key:
        raise RuntimeError(
            "HF_TOKEN is missing. Copy infra/.env.example to infra/env and add a Hugging Face "
            "token with Inference Providers permission from "
            "https://huggingface.co/settings/tokens"
        )

    return OpenAI(
        api_key=api_key,
        base_url="https://router.huggingface.co/v1",
    )


def complete_chat(messages: list[dict[str, str]], max_tokens: int = 256) -> str:
    """Send chat messages to gpt-oss-20b and return the assistant text."""
    output = create_client().chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=messages,
        max_tokens=max_tokens,
    )
    return output.choices[0].message.content or ""
