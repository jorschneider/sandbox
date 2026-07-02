"""Provider routing + OpenAI-compatible client (no network — _post is stubbed)."""
from wargame_eval.agents.providers import (
    OpenAICompatibleModelClient, make_commander, model_label, model_origin)
from wargame_eval.state import Side


def test_labels_and_origins():
    assert model_label("deepseek/deepseek-chat-v3.1") == "DeepSeek V3.1"
    assert model_origin("qwen/qwen3-max") == "Alibaba"
    assert model_origin("z-ai/glm-4.6") == "Zhipu"
    assert model_label("claude-opus-4-8") == "Opus 4.8"
    assert model_label("claude-fable-5") == "Fable 5"
    assert model_origin("claude-fable-5") == "Anthropic"
    # unknown slug falls back to a title-cased name
    assert model_label("foo/bar-baz") == "Bar Baz"


def test_routing_picks_the_right_client():
    cn = make_commander("deepseek/deepseek-chat-v3.1", seed=1)
    assert isinstance(cn.client, OpenAICompatibleModelClient)
    assert cn.client.model == "deepseek/deepseek-chat-v3.1"
    assert cn.client.openai_native is False          # Chinese models -> OpenRouter
    # Claude ids route to the native client (lazy anthropic import; not called here).
    for mid in ("claude-haiku-4-5", "claude-fable-5"):
        cl = make_commander(mid, seed=1)
        assert cl.client.__class__.__name__ == "AnthropicModelClient"


def test_openai_models_route_to_openai_endpoint():
    c = make_commander("gpt-5.5", seed=1)
    assert isinstance(c.client, OpenAICompatibleModelClient)
    assert c.client.openai_native is True
    assert "api.openai.com" in c.client.base_url
    assert c.client.api_key_env == "OPENAI_API_KEY"


def test_openai_native_body_uses_completion_tokens(monkeypatch):
    c = OpenAICompatibleModelClient("gpt-5.5", base_url="https://api.openai.com/v1",
                                    api_key_env="OPENAI_API_KEY")
    sent = {}

    def fake_post(body):
        sent.update(body)
        return {"choices": [{"message": {"content": '{"allocation": {"cap": 1}}'}}]}

    monkeypatch.setattr(c, "_post", fake_post)
    c.generate_json("sys", "go", {"type": "object"})
    assert "max_completion_tokens" in sent and "max_tokens" not in sent
    assert "temperature" not in sent                  # reasoning models use the default


def test_parse_strips_fences():
    p = OpenAICompatibleModelClient._parse
    assert p('{"a": 1}') == {"a": 1}
    assert p('```json\n{"a": 2}\n```') == {"a": 2}
    assert p('```\n{"a": 3}\n```') == {"a": 3}


def test_generate_json_uses_chat_completion(monkeypatch):
    c = OpenAICompatibleModelClient("vendor/model", base_url="https://x/api/v1")
    sent = {}

    def fake_post(body):
        sent.update(body)
        return {"choices": [{"message": {"content": '{"allocation": {"cap": 3}, "rationale": "x"}'}}]}

    monkeypatch.setattr(c, "_post", fake_post)
    out = c.generate_json("sys", "do it", {"type": "object"})
    assert out["allocation"]["cap"] == 3
    assert sent["model"] == "vendor/model"
    assert sent["response_format"] == {"type": "json_object"}


_OBS = {"your_available_sorties": {"4th": 4, "4.5": 4, "5th": 2, "bomber": 0, "tanker": 0},
        "amphib_flotillas_remaining": 6, "amphib_flotillas_initial": 6,
        "pla_lodgment": 0, "taiwan_ground_strength": 100, "your_missiles": {},
        "your_naval": {"subron": 3}}


def test_commander_falls_back_when_retries_exhausted(monkeypatch):
    cmd = make_commander("deepseek/deepseek-chat-v3.1", seed=2)
    cmd.max_attempts = 1                         # no retries → immediate fallback

    def boom(*a, **k):
        raise RuntimeError("network down")

    monkeypatch.setattr(cmd.client, "generate_json", boom)
    out = cmd.decide(Side.BLUE, "BLUE_NAVAL", _OBS, {})
    assert "subron_on_barrier" in out            # heuristic fallback produced a valid order
    assert cmd.fallback_count == 1


def test_commander_retries_transient_failures_then_succeeds(monkeypatch):
    cmd = make_commander("deepseek/deepseek-chat-v3.1", seed=2)
    monkeypatch.setattr(cmd, "_sleep", lambda *_a: None)   # don't actually wait
    calls = {"n": 0}

    def flaky(*a, **k):
        calls["n"] += 1
        if calls["n"] < 3:
            raise ValueError("empty reply")      # two intermittent failures
        return {"subron_on_barrier": 2, "rationale": "ok"}

    monkeypatch.setattr(cmd.client, "generate_json", flaky)
    out = cmd.decide(Side.BLUE, "BLUE_NAVAL", _OBS, {})
    assert out["subron_on_barrier"] == 2         # got the real answer after retries
    assert cmd.fallback_count == 0 and cmd.retry_count == 2
