"""Fetch OpenAI standard token prices from the public pricing docs."""

from __future__ import annotations

import re
import time
import urllib.error
import urllib.request

from model.openai.constant import PRICING_CACHE_TTL_SECONDS, PRICING_URL

_STANDARD_HEADING = "### Standard pricing data"
_cached_table: tuple[float, dict[str, dict[str, float]]] | None = None
_DOLLAR = re.compile(r"\$([0-9]+(?:\.[0-9]+)?)")
_NOTE = re.compile(r"\s*\(.*\)\s*$")


def lookup_standard_pricing(model_id: str) -> dict[str, float] | None:
    """Return per-1M-token input and output USD rates for this model id."""
    chosen = (model_id or "").strip().lower()
    if not chosen:
        return None
    table = _standard_table()
    if chosen in table:
        return table[chosen]
    matches = [key for key in table if chosen == key or chosen.startswith(f"{key}-")]
    if not matches:
        return None
    return table[max(matches, key=len)]


def estimate_cost(model_id: str, prompt_tokens: int, completion_tokens: int) -> dict[str, float] | None:
    """Return USD input, output, and total cost for one completion."""
    rates = lookup_standard_pricing(model_id)
    if not rates:
        return None
    million = 1_000_000
    input_cost = (prompt_tokens / million) * rates["input_per_million"]
    output_cost = (completion_tokens / million) * rates["output_per_million"]
    return {
        "input": input_cost,
        "output": output_cost,
        "total": input_cost + output_cost,
    }


def _standard_table() -> dict[str, dict[str, float]]:
    """Return the cached Standard pricing table, refreshing it when stale."""
    global _cached_table
    now = time.monotonic()
    if _cached_table is None or now - _cached_table[0] >= PRICING_CACHE_TTL_SECONDS:
        _cached_table = (now, _parse_standard_table(_fetch_pricing_markdown()))
    return _cached_table[1]


def _fetch_pricing_markdown() -> str:
    """Download the OpenAI pricing markdown page."""
    request = urllib.request.Request(
        PRICING_URL,
        headers={"User-Agent": "local-chatbot"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read().decode("utf-8")


def _parse_standard_table(markdown: str) -> dict[str, dict[str, float]]:
    """Read short-context input and output columns from the Standard table."""
    start = markdown.find(_STANDARD_HEADING)
    if start < 0:
        return {}
    rest = markdown[start:]
    next_heading = rest.find("\n### ", len(_STANDARD_HEADING))
    section = rest if next_heading < 0 else rest[:next_heading]
    table: dict[str, dict[str, float]] = {}
    for line in section.splitlines():
        if not line.startswith("|") or line.startswith("| ---") or line.startswith("| Model"):
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) < 5:
            continue
        name = _NOTE.sub("", cells[0]).strip().lower()
        input_rate = _parse_dollar(cells[1])
        output_rate = _parse_dollar(cells[4])
        if not name or input_rate is None or output_rate is None:
            continue
        table[name] = {
            "input_per_million": input_rate,
            "output_per_million": output_rate,
        }
    return table


def _parse_dollar(cell: str) -> float | None:
    """Parse a $0.15 cell, or None when the docs use a dash."""
    match = _DOLLAR.search(cell or "")
    if not match:
        return None
    return float(match.group(1))
