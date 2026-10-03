"""Local Transformers models loaded from a folder path on the GPU."""

from __future__ import annotations

from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from model.local.constant import COMPANY_ID, PROVIDER_ID, PROVIDER_LABEL
from model.local.parameter import (
    apply_generation_defaults,
    context_length_from_config,
    read_folder_json,
    transformers_chat_parameters,
)
from model.local.store import resolve_model_folder
from model.parameter import sanitize_settings
from model.provider import Provider


class LocalProvider(Provider):
    """Run a Hugging Face folder with Transformers on CUDA. Paths only until chat."""

    id = PROVIDER_ID
    label = PROVIDER_LABEL

    def __init__(self) -> None:
        super().__init__()
        self._loaded_path: str | None = None
        self._tokenizer = None
        self._model = None

    def create_client(self):
        """Weights stay unloaded until the first complete_chat for a path."""
        return None

    def owns_model(self, model_id: str) -> bool:
        """Claim absolute filesystem paths so they are not sent to Hugging Face."""
        chosen = (model_id or "").strip()
        if not chosen:
            return False
        return Path(chosen).is_absolute()

    def listed_models(self) -> list[dict]:
        """Local models are chosen from a folder, not listed from a saved catalog."""
        return []

    def get_panel_entry(self) -> dict | None:
        """Always show Local, even before the user has added a folder."""
        entry = super().get_panel_entry()
        if entry:
            return entry
        return {
            "id": self.id,
            "label": self.label,
            "companies": [{"id": COMPANY_ID, "label": COMPANY_ID, "models": []}],
        }

    def list_parameters(self, model_id: str) -> list[dict]:
        """Read config.json and generation_config.json only."""
        folder = resolve_model_folder(model_id)
        config = read_folder_json(folder, "config.json")
        generation = read_folder_json(folder, "generation_config.json")
        parameters = transformers_chat_parameters(context_length_from_config(config))
        apply_generation_defaults(parameters, generation)
        return parameters

    def complete_chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str,
        settings: dict | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """Load the folder onto CUDA on first use, then generate."""
        folder = resolve_model_folder(model)
        model_id, cleaned = sanitize_settings(str(folder), settings)
        self._ensure_loaded(folder)
        if max_tokens is not None:
            cleaned["max_new_tokens"] = max_tokens

        prompt = self._build_prompt(messages)
        tokenizer = self._tokenizer
        inputs = tokenizer(prompt, return_tensors="pt").to(self._model.device)
        generate_kwargs = {
            "max_new_tokens": int(cleaned.get("max_new_tokens") or 128),
            "temperature": float(cleaned.get("temperature") or 0.7),
            "top_p": float(cleaned.get("top_p") or 0.9),
            "repetition_penalty": float(cleaned.get("repetition_penalty") or 1),
        }
        top_k = int(cleaned.get("top_k") or 0)
        if top_k > 0:
            generate_kwargs["top_k"] = top_k
        if generate_kwargs["temperature"] <= 0:
            generate_kwargs["do_sample"] = False
            generate_kwargs.pop("temperature", None)
            generate_kwargs.pop("top_p", None)
            generate_kwargs.pop("top_k", None)
        else:
            generate_kwargs["do_sample"] = True

        output = self._model.generate(
            **inputs,
            pad_token_id=tokenizer.pad_token_id,
            **generate_kwargs,
        )
        new_tokens = output[0, inputs["input_ids"].shape[1] :]
        return tokenizer.decode(new_tokens, skip_special_tokens=True).strip()

    def _ensure_loaded(self, folder: Path) -> None:
        """Load tokenizer and model onto CUDA once per folder."""
        resolved = str(folder)
        if self._loaded_path == resolved and self._model is not None:
            return

        if not torch.cuda.is_available():
            raise RuntimeError("Local models need a CUDA GPU. PyTorch does not see CUDA.")

        self._tokenizer = AutoTokenizer.from_pretrained(resolved)
        self._model = AutoModelForCausalLM.from_pretrained(
            resolved,
            torch_dtype=torch.float16,
            device_map="cuda",
        )
        if self._tokenizer.pad_token_id is None and self._tokenizer.eos_token_id is not None:
            self._tokenizer.pad_token = self._tokenizer.eos_token
        self._loaded_path = resolved

    def _build_prompt(self, messages: list[dict[str, str]]) -> str:
        """Use the tokenizer chat template when the model defines one."""
        turns = [
            {"role": message["role"], "content": message["content"]}
            for message in messages
            if message.get("role") in {"system", "user", "assistant"} and message.get("content")
        ]
        tokenizer = self._tokenizer
        if getattr(tokenizer, "chat_template", None):
            return tokenizer.apply_chat_template(turns, tokenize=False, add_generation_prompt=True)
        parts = []
        for turn in turns:
            parts.append(f"{turn['role']}: {turn['content']}")
        parts.append("assistant:")
        return "\n".join(parts)
