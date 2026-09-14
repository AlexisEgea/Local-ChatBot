"""Generation parameters taken from the model's Hugging Face repository."""

from __future__ import annotations

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


def clamp_value(parameter: dict, raw: object):
    """Coerce one setting to the parameter type and range."""
    kind = parameter["type"]
    if kind == "boolean":
        if isinstance(raw, str):
            return raw.lower() in {"1", "true", "yes", "on"}
        return bool(raw)
    if kind == "select":
        allowed = {option["id"] for option in parameter["options"]}
        return raw if raw in allowed else parameter["default"]
    try:
        value = int(raw) if kind == "integer" else float(raw)
    except (TypeError, ValueError) as error:
        raise ValueError(f"Invalid {parameter['id']}") from error
    low = parameter.get("min")
    high = parameter.get("max")
    if low is not None:
        value = max(low, value)
    if high is not None:
        value = min(high, value)
    return value


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
