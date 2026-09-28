"""Check that an API key is accepted by its provider."""

from huggingface_hub import HfApi
from openai import OpenAI

from api_key.constant import API_KEY_FIELDS


def test_api_key(key_id: str, value: str) -> None:
    """Raise ValueError when the key is empty, unknown, or rejected."""
    token = (value or "").strip()
    known = {field["id"] for field in API_KEY_FIELDS}
    if key_id not in known:
        raise ValueError(f"Unknown API key: {key_id}.")
    if not token:
        raise ValueError("Enter an API key first.")
    if key_id == "HF_TOKEN":
        _test_huggingface(token)
        return
    if key_id == "OPENAI_API_KEY":
        _test_openai(token)
        return
    raise ValueError(f"No test is defined for {key_id}.")


def _test_huggingface(token: str) -> None:
    """Call Hugging Face whoami to verify the token."""
    try:
        HfApi(token=token).whoami()
    except Exception as error:
        raise ValueError("This Hugging Face token is invalid.") from error


def _test_openai(token: str) -> None:
    """List models with the official OpenAI client to verify the key."""
    try:
        next(iter(OpenAI(api_key=token).models.list()), None)
    except Exception as error:
        raise ValueError("This OpenAI API key is invalid.") from error
