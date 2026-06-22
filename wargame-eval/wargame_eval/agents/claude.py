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

    def __init__(self, model: str = "claude-opus-4-8", effort: str = "low",
                 max_tokens: int = 1500) -> None:
        self.model = model
        self.effort = effort
        self.max_tokens = max_tokens
        self._client = None
        self._mode = "modern"   # downgrades to "plain" if structured outputs 400

    def _ensure_client(self):
        if self._client is None:
            import anthropic  # lazy: only needed when actually calling the API
            self._client = anthropic.Anthropic()
        return self._client

    @staticmethod
    def _parse(resp) -> dict:
        if getattr(resp, "stop_reason", None) == "refusal":
            raise RuntimeError("model refused")
        text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
        text = text.strip()
        if text.startswith("```"):  # strip markdown fences if present
            text = text.split("```", 2)[1].lstrip("json").strip()
        return json.loads(text)

    def generate_json(self, system: str, prompt: str, schema: dict) -> dict:
        client = self._ensure_client()
        base = dict(model=self.model, max_tokens=self.max_tokens, system=system,
                    messages=[{"role": "user", "content": prompt}])
        if self._mode == "modern":
            try:
                resp = client.messages.create(
                    thinking={"type": "adaptive"},
                    output_config={"format": {"type": "json_schema", "schema": schema},
                                   "effort": self.effort},
                    **base)
                return self._parse(resp)
            except (TypeError, Exception) as e:  # noqa: BLE001 — degrade once on param issues
                import anthropic
                if isinstance(e, (anthropic.AuthenticationError, anthropic.RateLimitError,
                                  anthropic.APIConnectionError, RuntimeError)):
                    raise
                self._mode = "plain"  # SDK/endpoint doesn't accept these params here
        # Plain path: instruct JSON-only and parse the text.
        plain = dict(base)
        plain["messages"] = [{"role": "user", "content":
                              prompt + "\n\nReply with ONLY minified JSON, no prose."}]
        return self._parse(client.messages.create(**plain))


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
