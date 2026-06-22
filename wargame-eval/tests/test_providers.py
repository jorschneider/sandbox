"""Provider routing + OpenAI-compatible client (no network — _post is stubbed)."""
from wargame_eval.agents.providers import (
    OpenAICompatibleModelClient, make_commander, model_label, model_origin)
from wargame_eval.state import Side


def test_labels_and_origins():
    assert model_label("deepseek/deepseek-chat-v3.1") == "DeepSeek V3.1"
    assert model_origin("qwen/qwen3-max") == "Alibaba"
    assert model_origin("z-ai/glm-4.6") == "Zhipu"
    assert model_label("claude-opus-4-8") == "Opus 4.8"
    # unknown slug falls back to a title-cased name
    assert model_label("foo/bar-baz") == "Bar Baz"


def test_routing_picks_the_right_client():
    cn = make_commander("deepseek/deepseek-chat-v3.1", seed=1)
    assert isinstance(cn.client, OpenAICompatibleModelClient)
    assert cn.client.model == "deepseek/deepseek-chat-v3.1"
    # Claude ids route to the native client (lazy anthropic import; not called here).
    cl = make_commander("claude-haiku-4-5", seed=1)
    assert cl.client.__class__.__name__ == "AnthropicModelClient"


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


def test_commander_falls_back_on_client_error(monkeypatch):
    cmd = make_commander("deepseek/deepseek-chat-v3.1", seed=2)

    def boom(*a, **k):
        raise RuntimeError("network down")

    monkeypatch.setattr(cmd.client, "generate_json", boom)
    obs = {"your_available_sorties": {"4th": 4, "4.5": 4, "5th": 2, "bomber": 0, "tanker": 0},
           "amphib_flotillas_remaining": 6, "amphib_flotillas_initial": 6,
           "pla_lodgment": 0, "taiwan_ground_strength": 100, "your_missiles": {},
           "your_naval": {"subron": 3}}
    out = cmd.decide(Side.BLUE, "BLUE_NAVAL", obs, {})
    assert "subron_on_barrier" in out          # heuristic fallback produced a valid order
    assert cmd.fallback_count == 1
