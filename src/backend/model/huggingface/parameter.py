"""Hugging Face generation knobs and Hub generation_config overlays."""

from __future__ import annotations

from model.parameter import clamp_value

_REASONING_HINTS = (
    "gpt-oss",
    "reasoning",
    "thinking",
    "reasoner",
    "deepseek-r1",
    "qwq",
)

HUB_KEY_ALIASES = {
    "max_new_tokens": "max_tokens",
    "max_length": "max_tokens",
}
_SKIP_KEYS = {
    "bos_token_id",
    "eos_token_id",
    "pad_token_id",
    "decoder_start_token_id",
    "forced_bos_token_id",
    "forced_eos_token_id",
    "transformers_version",
    "model_type",
    "_from_model_config",
}


def huggingface_chat_parameters(context_length: int | None) -> list[dict]:
    """Return the Hugging Face OpenAI-compatible chat knobs for this context window."""
    high = context_length or 4096
    return [
        {
            "id": "max_tokens",
            "label": "Max tokens",
            "type": "integer",
            "min": 1,
            "max": high,
            "step": 1,
            "default": min(256, high),
        },
        {
            "id": "temperature",
            "label": "Temperature",
            "type": "number",
            "min": 0,
            "max": 2,
            "step": 0.05,
            "default": 1,
        },
        {
            "id": "top_p",
            "label": "Top p",
            "type": "number",
            "min": 0,
            "max": 1,
            "step": 0.05,
            "default": 1,
        },
        {
            "id": "frequency_penalty",
            "label": "Frequency penalty",
            "type": "number",
            "min": -2,
            "max": 2,
            "step": 0.1,
            "default": 0,
        },
        {
            "id": "presence_penalty",
            "label": "Presence penalty",
            "type": "number",
            "min": -2,
            "max": 2,
            "step": 0.1,
            "default": 0,
        },
    ]


def reasoning_parameter() -> dict:
    """Return the chat-API reasoning control for models that support it."""
    return {
        "id": "reasoning_effort",
        "label": "Reasoning effort",
        "type": "select",
        "default": "low",
        "options": [
            {"id": "none", "label": "None"},
            {"id": "low", "label": "Low"},
            {"id": "medium", "label": "Medium"},
            {"id": "high", "label": "High"},
        ],
    }


def supports_reasoning(model_id: str, tags: list[str]) -> bool:
    """Return True when the model id or Hub tags look like a reasoning model."""
    blob = f"{model_id} {' '.join(tags)}".lower()
    return any(hint in blob for hint in _REASONING_HINTS)


def apply_hub_defaults(parameters: list[dict], config: dict) -> None:
    """Overlay generation_config defaults onto the inference chat knobs."""
    for parameter in parameters:
        raw = config.get(parameter["id"])
        if raw is None:
            for hub_key, chat_key in HUB_KEY_ALIASES.items():
                if chat_key == parameter["id"] and hub_key in config:
                    raw = config[hub_key]
                    break
        if raw is None:
            continue
        try:
            parameter["default"] = clamp_value(parameter, raw)
        except ValueError:
            continue


def numeric_bounds(key: str, value: float, context_length: int | None) -> tuple[float, float, float]:
    """Infer a slider range from the parameter name and the model's context window."""
    lowered = key.lower()
    if "temperature" in lowered:
        return 0, 2, 0.05
    if "top_p" in lowered or lowered.endswith("_p"):
        return 0, 1, 0.05
    if "penalty" in lowered:
        return 0, 2, 0.05
    if "top_k" in lowered:
        return 0, 200, 1
    if "max" in lowered:
        high = context_length or max(int(value), 4096)
        return 1, high, 1
    if isinstance(value, float) and not float(value).is_integer():
        return 0, max(2.0, abs(value) * 2), 0.05
    return 0, max(100, abs(int(value)) * 4, context_length or 0), 1


def widget_from_repo_value(key: str, value: object, context_length: int | None) -> dict | None:
    """Turn one generation_config field into a Model-panel widget."""
    if key in _SKIP_KEYS or key.startswith("_") or key.endswith("_id") or key.endswith("_ids"):
        return None
    if "token" in key.lower():
        return None

    label = key.replace("_", " ").capitalize()
    if isinstance(value, bool):
        return {"id": key, "label": label, "type": "boolean", "default": value}
    if isinstance(value, int) and not isinstance(value, bool):
        low, high, step = numeric_bounds(key, float(value), context_length)
        return {
            "id": key,
            "label": label,
            "type": "integer",
            "min": int(low),
            "max": int(high),
            "step": int(step) or 1,
            "default": int(value),
        }
    if isinstance(value, float):
        low, high, step = numeric_bounds(key, value, context_length)
        return {
            "id": key,
            "label": label,
            "type": "number",
            "min": low,
            "max": high,
            "step": step,
            "default": value,
        }
    return None
