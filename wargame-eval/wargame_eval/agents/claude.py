"""Claude-backed commander (the model under test).

Uses the official Anthropic SDK with structured outputs so orders parse
reliably, adaptive thinking, and (for Fable 5) server-side refusal fallbacks.
The SDK is imported lazily, so the package works without `anthropic` installed
or without an API key — in that case (or on any error/refusal) the commander
falls back to the deterministic HeuristicCommander, and the fallback is logged.

Model IDs (per the Anthropic model catalog): claude-opus-4-8, claude-sonnet-4-6,
claude-haiku-4-5, claude-fable-5.
"""
from __future__ import annotations

import json

from ..state import Side
from .heuristic import HeuristicCommander

_SYSTEM = (
    "You are the {side} operational commander in the CSIS Taiwan Operational "
    "Wargame (a 2028 Chinese invasion of Taiwan). Each turn is 3.5 days. RED is "
    "China; BLUE is the US/Japan/Taiwan coalition. RED wins by establishing a "
    "sustainable lodgment on Taiwan (forces ashore + functional ports/airports); "
    "BLUE wins by gutting the amphibious fleet and confining RED to a beachhead. "
    "You are given an observation of the current situation and a JSON schema for "
    "this phase's orders. Reply with ONLY a JSON object matching the schema. "
    "Allocate within the forces you actually have available."
)


class AnthropicModelClient:
    """Provider-agnostic ModelClient backed by the Anthropic SDK."""

    def __init__(self, model: str = "claude-opus-4-8", effort: str = "high") -> None:
        self.model = model
        self.effort = effort
        self._client = None

    def _ensure_client(self):
        if self._client is None:
            import anthropic  # lazy: only needed when actually calling the API
            self._client = anthropic.Anthropic()
        return self._client

    def generate_json(self, system: str, prompt: str, schema: dict) -> dict:
        client = self._ensure_client()
        kwargs = dict(
            model=self.model,
            max_tokens=8000,
            system=system,
            messages=[{"role": "user", "content": prompt}],
            output_config={"format": {"type": "json_schema", "schema": schema},
                           "effort": self.effort},
        )
        # Fable 5: thinking is always on (omit the param); enable refusal fallback.
        if self.model != "claude-fable-5":
            kwargs["thinking"] = {"type": "adaptive"}
        if self.model == "claude-fable-5":
            resp = client.beta.messages.create(
                betas=["server-side-fallback-2026-06-01"],
                fallbacks=[{"model": "claude-opus-4-8"}], **kwargs)
        else:
            resp = client.messages.create(**kwargs)
        if getattr(resp, "stop_reason", None) == "refusal":
            raise RuntimeError("model refused")
        text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
        return json.loads(text)


class ClaudeCommander:
    def __init__(self, model: str = "claude-opus-4-8", seed: int = 0,
                 client: AnthropicModelClient | None = None) -> None:
        self.name = model
        self.client = client or AnthropicModelClient(model)
        self._fallback = HeuristicCommander(name=f"{model}-fallback", seed=seed)
        self.fallback_count = 0

    def decide(self, side: Side, phase: str, observation: dict, schema: dict) -> dict:
        system = _SYSTEM.format(side=side.value)
        prompt = (
            f"PHASE: {phase}\n\n"
            f"OBSERVATION:\n{json.dumps(observation, indent=2)}\n\n"
            f"Respond with JSON matching this schema:\n{json.dumps(schema)}"
        )
        try:
            return self.client.generate_json(system, prompt, schema)
        except Exception:
            # Network/SDK/refusal/parse failure → deterministic fallback.
            self.fallback_count += 1
            return self._fallback.decide(side, phase, observation, schema)
