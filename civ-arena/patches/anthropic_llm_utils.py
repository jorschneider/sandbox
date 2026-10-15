"""Optional Claude adapter for CivAgent — lets Claude models play in the arena.

CivAgent routes LLM calls by model-name in
civagent/utils/ollama_utils.py::CustomOllama.chat. Out of the box it knows
deepseek / openai / ollama. This adds Claude via the official Anthropic SDK
(not an OpenAI-compatible shim).

INSTALL (run from the CivAgent checkout, e.g. vendor/CivAgent):
  1. pip install anthropic
  2. cp <this file> civagent/utils/anthropic_llm_utils.py
  3. In civagent/utils/ollama_utils.py, inside CustomOllama.chat's retry
     block, add a Claude branch BEFORE the catch-all `else` that calls
     openai_like_llm_server:

         elif self.model.startswith("claude"):
             from civagent.utils.anthropic_llm_utils import anthropic_llm_server
             message, raw = anthropic_llm_server(
                 payload, self.model, self.request_timeout, self.llm_config, self.api_key,
             )

  4. Set ANTHROPIC_API_KEY in the environment, and give a seat a Claude model
     string in models.yaml, e.g.  china: { model: claude-opus-4-8 }

Current Claude model IDs: claude-opus-4-8 (most capable Opus), claude-sonnet-4-6,
claude-haiku-4-5. Use the bare IDs — do not append date suffixes.
"""
from typing import Any, Dict, Tuple

from anthropic import Anthropic

# Reuse CivAgent's config for an optional fallback key.
try:
    from civagent.config import config_data
    _CONFIG_KEY = config_data.get("LLM", {}).get("anthropic_api_key", "") or ""
except Exception:
    _CONFIG_KEY = ""


def anthropic_llm_server(
    payload: Dict[str, Any],
    model: str,
    request_timeout: float,
    llm_config: Dict[str, Any],
    api_key: str = "",
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Call Claude and return CivAgent's ({"role","content"}, raw) tuple.

    The arena prompts the model to emit JSON and parses the returned text, so
    this returns the final text block as content (matching the deepseek/openai
    adapters' contract).
    """
    # api_key resolution mirrors the other adapters: per-call key wins, else env/config.
    client = Anthropic(api_key=api_key or _CONFIG_KEY or None)  # None -> ANTHROPIC_API_KEY

    # CivAgent payloads carry OpenAI-style messages; Anthropic wants the system
    # prompt hoisted out of the messages list.
    system = "\n".join(m["content"] for m in payload["messages"] if m.get("role") == "system")
    messages = [
        {"role": ("assistant" if m["role"] == "assistant" else "user"), "content": m["content"]}
        for m in payload["messages"]
        if m.get("role") != "system"
    ]

    kwargs: Dict[str, Any] = {
        "model": model,
        "max_tokens": 4096,  # room for adaptive thinking + a JSON action
        "messages": messages,
        "thinking": {"type": "adaptive"},  # recommended for strategic reasoning
    }
    if system:
        kwargs["system"] = system

    resp = client.messages.create(**kwargs)
    text = "".join(b.text for b in resp.content if b.type == "text")
    return {"role": "user", "content": text}, {}
