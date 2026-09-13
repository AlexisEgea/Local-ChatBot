"""OpenAI-compatible client pointed at Hugging Face Inference."""

import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

ROOT = Path(__file__).resolve().parents[3]
load_dotenv(ROOT / "infra" / "env")


def _fix_invalid_ssl_env() -> None:
    """Drop conda/Git Bash SSL vars that point to a missing certificate file."""
    for key in ("SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE"):
        value = os.environ.get(key)
        if value and not Path(value).is_file():
            os.environ.pop(key, None)

    fallback = Path(os.environ.get("CONDA_PREFIX", "")) / "Library" / "ssl" / "cacert.pem"
    if fallback.is_file() and not os.environ.get("SSL_CERT_FILE"):
        os.environ["SSL_CERT_FILE"] = str(fallback)


_fix_invalid_ssl_env()


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
