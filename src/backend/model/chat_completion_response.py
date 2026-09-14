"""Send a chat completion request and return the assistant reply."""

from model.client import create_client
from model.parameters.list_model_parameters import sanitize_settings

OPENAI_CREATE_KEYS = {
    "max_tokens",
    "temperature",
    "top_p",
    "frequency_penalty",
    "presence_penalty",
    "seed",
}
REQUEST_KEY_ALIASES = {
    "max_new_tokens": "max_tokens",
    "max_length": "max_tokens",
}


def complete_chat(
    messages: list[dict[str, str]],
    max_tokens: int | None = None,
    model: str | None = None,
    settings: dict | None = None,
) -> str:
    """Send chat messages to the selected model and return the assistant text."""
    model_id, cleaned = sanitize_settings(model, settings)
    if max_tokens is not None:
        cleaned["max_tokens"] = max_tokens

    mapped = {REQUEST_KEY_ALIASES.get(key, key): value for key, value in cleaned.items()}
    if mapped.get("reasoning_effort") in {None, "none"}:
        mapped.pop("reasoning_effort", None)
    create_kwargs = {key: mapped[key] for key in OPENAI_CREATE_KEYS if key in mapped}
    extra_body = {key: value for key, value in mapped.items() if key not in OPENAI_CREATE_KEYS}
    if extra_body:
        create_kwargs["extra_body"] = extra_body

    output = create_client().chat.completions.create(
        model=model_id,
        messages=messages,
        **create_kwargs,
    )
    message = output.choices[0].message
    content = (message.content or "").strip()
    if content:
        return content
    reasoning = getattr(message, "reasoning", None) or getattr(message, "reasoning_content", None)
    return (reasoning or "").strip()
