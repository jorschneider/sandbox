"""Provider-agnostic model clients and a routing factory.

Adds an OpenAI-compatible client (OpenRouter, DeepSeek, Moonshot, Together, …)
so non-Anthropic models — notably the Chinese open models — can play. The
factory routes a model id to the right client:

  - "claude-*"           -> AnthropicModelClient (native Anthropic SDK)
  - "vendor/model" slug  -> OpenAICompatibleModelClient (OpenRouter by default)

Auth/endpoint for the OpenAI-compatible path come from env (KIMI_API_KEY /
KIMI_BASE_URL in this environment point at OpenRouter). No SDK dependency — the
client uses urllib so the package stays dependency-free.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

from .claude import ClaudeCommander  # generic commander (builds prompt, parses, falls back)

# Display labels + origin for known models (others are title-cased from the slug).
MODEL_INFO = {
    "claude-opus-4-8": ("Opus 4.8", "Anthropic"),
    "claude-sonnet-4-6": ("Sonnet 4.6", "Anthropic"),
    "claude-haiku-4-5": ("Haiku 4.5", "Anthropic"),
    # OpenAI (Western frontier)
    "gpt-5.5": ("GPT-5.5", "OpenAI"),
    "gpt-5.4": ("GPT-5.4", "OpenAI"),
    "gpt-5.2": ("GPT-5.2", "OpenAI"),
    # Chinese labs (flagship + earlier entries)
    "deepseek/deepseek-chat-v3.1": ("DeepSeek V3.1", "DeepSeek"),
    "deepseek/deepseek-v3.2": ("DeepSeek V3.2", "DeepSeek"),
    "deepseek/deepseek-v4-pro": ("DeepSeek V4 Pro", "DeepSeek"),
    "qwen/qwen3-max": ("Qwen3 Max", "Alibaba"),
    "qwen/qwen3-235b-a22b-2507": ("Qwen3 235B", "Alibaba"),
    "qwen/qwen3.7-max": ("Qwen3.7 Max", "Alibaba"),
    "z-ai/glm-4.6": ("GLM-4.6", "Zhipu"),
    "z-ai/glm-5.2": ("GLM-5.2", "Zhipu"),
    "minimax/minimax-m2": ("MiniMax M2", "MiniMax"),
    "minimax/minimax-m3": ("MiniMax M3", "MiniMax"),
    "moonshotai/kimi-k2": ("Kimi K2", "Moonshot"),
    "moonshotai/kimi-k2.6": ("Kimi K2.6", "Moonshot"),
}
CHINESE_ORIGINS = {"DeepSeek", "Alibaba", "Zhipu", "MiniMax", "Moonshot"}


def _is_openai(model_id: str) -> bool:
    """OpenAI-native model ids (routed to the OpenAI endpoint with OPENAI_API_KEY)."""
    return model_id.startswith(("gpt-", "o1", "o3", "o4", "o5"))


def model_label(model_id: str) -> str:
    if model_id in MODEL_INFO:
        return MODEL_INFO[model_id][0]
    name = model_id.split("/")[-1]
    return name.replace("-", " ").title()


def model_origin(model_id: str) -> str:
    if model_id in MODEL_INFO:
        return MODEL_INFO[model_id][1]
    return model_id.split("/")[0] if "/" in model_id else "?"


class OpenAICompatibleModelClient:
    """Talks to any OpenAI-compatible /chat/completions endpoint via urllib."""

    def __init__(self, model: str, base_url: str | None = None,
                 api_key_env: str = "KIMI_API_KEY", base_url_env: str = "KIMI_BASE_URL") -> None:
        self.model = model
        self.api_key_env = api_key_env
        self.base_url = (base_url or os.environ.get(base_url_env)
                         or "https://openrouter.ai/api/v1").rstrip("/")
        # OpenAI-native endpoints (reasoning models) want max_completion_tokens, the
        # default temperature, and a longer timeout — and benefit from more headroom
        # for reasoning tokens.
        self.openai_native = "api.openai.com" in self.base_url
        self.timeout = 300 if self.openai_native else 120
        self._mode = "json_object"   # downgrade to plain if the provider 400s on it

    def _post(self, body: dict) -> dict:
        key = os.environ.get(self.api_key_env)
        if not key:
            raise RuntimeError(f"{self.api_key_env} not set")
        req = urllib.request.Request(
            self.base_url + "/chat/completions",
            data=json.dumps(body).encode(),
            headers={"Authorization": "Bearer " + key, "Content-Type": "application/json",
                     "HTTP-Referer": "https://warbench.vercel.app", "X-Title": "WarBench"})
        with urllib.request.urlopen(req, timeout=self.timeout) as r:
            return json.load(r)

    @staticmethod
    def _parse(content: str) -> dict:
        content = (content or "").strip()
        if content.startswith("```"):
            content = content.split("```", 2)[1]
            if content[:4].lower() == "json":
                content = content[4:]
            content = content.strip()
        return json.loads(content)

    def generate_json(self, system: str, prompt: str, schema: dict) -> dict:
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt
             + "\n\nReply with ONLY a JSON object matching the schema. "
               "No prose, no markdown fences."},
        ]
        body = {"model": self.model, "messages": messages}
        if self.openai_native:
            # Reasoning models: max_completion_tokens (incl. reasoning), default temp.
            body["max_completion_tokens"] = 8000
        else:
            # Generous budget so reasoning models (DeepSeek etc.) have room for their
            # hidden reasoning *and* the JSON answer — 1500 starved them into empties.
            body["max_tokens"] = 8000
            body["temperature"] = 0.3
        if self._mode == "json_object":
            body["response_format"] = {"type": "json_object"}
        try:
            resp = self._post(body)
        except urllib.error.HTTPError as e:
            if e.code == 400 and self._mode == "json_object":
                self._mode = "plain"            # provider/model rejects response_format
                body.pop("response_format", None)
                resp = self._post(body)
            else:
                raise
        return self._parse(resp["choices"][0]["message"]["content"])


def make_commander(model_id: str, seed: int = 0) -> ClaudeCommander:
    """Route a model id to a commander backed by the right client."""
    if model_id.startswith("claude-"):
        return ClaudeCommander(model_id, seed=seed)        # native Anthropic
    if _is_openai(model_id):                               # OpenAI native (OPENAI_API_KEY)
        client = OpenAICompatibleModelClient(
            model_id, base_url="https://api.openai.com/v1", api_key_env="OPENAI_API_KEY")
    else:                                                  # OpenRouter (Chinese open models)
        client = OpenAICompatibleModelClient(model_id)
    return ClaudeCommander(model_id, seed=seed, client=client)
