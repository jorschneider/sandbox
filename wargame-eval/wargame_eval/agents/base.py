"""Commander interface and the provider-agnostic model-client protocol."""
from __future__ import annotations

from typing import Protocol, runtime_checkable

from ..state import Side


@runtime_checkable
class Commander(Protocol):
    """A player. Given an observation and the legal-action schema for a phase,
    returns structured orders (a dict matching the schema)."""

    name: str

    def decide(self, side: Side, phase: str, observation: dict, schema: dict) -> dict:
        ...


@runtime_checkable
class ModelClient(Protocol):
    """Provider-agnostic structured-generation client.

    Implementations: AnthropicModelClient (now); OpenAI/Google adapters later.
    `generate_json` must return a dict conforming to `schema`.
    """

    model: str

    def generate_json(self, system: str, prompt: str, schema: dict) -> dict:
        ...
