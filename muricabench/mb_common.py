"""MuricaBench shared plumbing: zero-dependency API clients, caching, credit guard.

Two API dialects:
  - openrouter: {KIMI_BASE_URL}/chat/completions with KIMI_API_KEY (base points at openrouter.ai)
  - openai:     https://api.openai.com/v1/chat/completions with OPENAI_API_KEY (gpt-5.x reasoning models)
"""
import json, os, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
RESULTS = os.path.join(HERE, "results")
RAW = os.path.join(RESULTS, "raw")
JUDGED = os.path.join(RESULTS, "judged")

OPENROUTER_BASE = os.environ.get("KIMI_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
OPENROUTER_KEY = os.environ.get("KIMI_API_KEY", "")
OPENAI_BASE = "https://api.openai.com/v1"
OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")

CREDIT_FLOOR = 0.75  # abort new OpenRouter calls if remaining credit drops below this


def _post(url, headers, body, timeout=120):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _get(url, headers, timeout=30):
    req = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def openrouter_credits():
    """Return (remaining, total, used) in USD, or (None, None, None) on failure."""
    try:
        d = _get(OPENROUTER_BASE + "/credits", {"Authorization": "Bearer " + OPENROUTER_KEY})["data"]
        total, used = float(d["total_credits"]), float(d["total_usage"])
        return round(total - used, 4), total, used
    except Exception as e:
        print("  [warn] could not read OpenRouter credits:", e)
        return None, None, None


def _extract_text(resp):
    """Pull assistant text out of a chat-completions response; also return finish_reason."""
    try:
        ch = resp["choices"][0]
    except (KeyError, IndexError):
        return "", "no_choices"
    msg = ch.get("message", {}) or {}
    finish = ch.get("finish_reason") or ch.get("native_finish_reason") or ""
    content = msg.get("content")
    if isinstance(content, list):  # some providers return content parts
        content = "".join(p.get("text", "") for p in content if isinstance(p, dict))
    if not content and msg.get("refusal"):
        content = "[REFUSAL] " + str(msg["refusal"])
        finish = finish or "refusal"
    return (content or ""), finish


def call_model(api, model, prompt, max_tokens, temperature=0.7, timeout=180, retries=4,
               force_reasoning=False):
    """Call a subject model. Returns dict: {text, finish_reason, usage, api, model, error}.

    Reasoning is minimized on purpose — MuricaBench measures the model's *default gut* answer,
    not a reasoned-out one, and it keeps cost and truncation down. Some providers (e.g. Gemini
    3.1 Pro) mandate reasoning; we detect that and fall back to low effort with token headroom.
    """
    last_err = None
    for attempt in range(retries):
        try:
            if api == "openai":
                url = OPENAI_BASE + "/chat/completions"
                headers = {"Authorization": "Bearer " + OPENAI_KEY, "Content-Type": "application/json"}
                body = {
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    # reasoning tokens count against this ceiling, so give generous headroom
                    "max_completion_tokens": max_tokens + 1200,
                    "reasoning_effort": "minimal",
                }
            else:  # openrouter
                url = OPENROUTER_BASE + "/chat/completions"
                headers = {
                    "Authorization": "Bearer " + OPENROUTER_KEY,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://muricabench.local",
                    "X-Title": "MuricaBench",
                }
                body = {
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                }
                if force_reasoning:
                    body["max_tokens"] = max_tokens + 1000  # headroom for mandatory reasoning tokens
                    body["reasoning"] = {"effort": "low"}
                else:
                    body["max_tokens"] = max_tokens
                    body["temperature"] = temperature
                    body["reasoning"] = {"enabled": False}
            resp = _post(url, headers, body, timeout=timeout)
            if isinstance(resp, dict) and resp.get("error"):
                # provider returned a structured error (e.g. content filter) — capture, don't crash
                err = resp["error"]
                msg = err.get("message", str(err)) if isinstance(err, dict) else str(err)
                if "reasoning is mandatory" in msg.lower() and not force_reasoning:
                    return call_model(api, model, prompt, max_tokens, temperature, timeout,
                                      retries, force_reasoning=True)
                return {"text": "", "finish_reason": "provider_error", "usage": {},
                        "api": api, "model": model, "error": msg}
            text, finish = _extract_text(resp)
            return {"text": text, "finish_reason": finish, "usage": resp.get("usage", {}) or {},
                    "api": api, "model": model, "error": None,
                    # reproducibility: record who actually served the request and under what regime
                    "provider": resp.get("provider", ""), "served_model": resp.get("model", ""),
                    "reasoning_fallback": force_reasoning}
        except urllib.error.HTTPError as e:
            try:
                detail = e.read().decode("utf-8")[:500]
            except Exception:
                detail = ""
            last_err = f"HTTP {e.code}: {detail}"
            if "reasoning is mandatory" in detail.lower() and not force_reasoning:
                return call_model(api, model, prompt, max_tokens, temperature, timeout,
                                  retries, force_reasoning=True)
            # content-filter / bad-request errors won't fix on retry — capture and move on
            if e.code in (400, 403, 404, 422):
                return {"text": "", "finish_reason": "http_%d" % e.code, "usage": {},
                        "api": api, "model": model, "error": last_err}
        except Exception as e:
            last_err = repr(e)
        time.sleep(2 ** attempt)
    return {"text": "", "finish_reason": "exhausted", "usage": {}, "api": api, "model": model, "error": last_err}


def call_json(api, model, system, user, timeout=120, retries=4, reasoning_effort="low"):
    """Call a model expecting a strict JSON object back (used by the judge). Returns parsed dict or None."""
    last_err = None
    for attempt in range(retries):
        try:
            if api == "openai":
                url = OPENAI_BASE + "/chat/completions"
                headers = {"Authorization": "Bearer " + OPENAI_KEY, "Content-Type": "application/json"}
                body = {
                    "model": model,
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                    "max_completion_tokens": 1500,
                    "reasoning_effort": reasoning_effort,
                    "response_format": {"type": "json_object"},
                }
            else:
                url = OPENROUTER_BASE + "/chat/completions"
                headers = {"Authorization": "Bearer " + OPENROUTER_KEY, "Content-Type": "application/json"}
                body = {
                    "model": model,
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                    "max_tokens": 1500,
                    "response_format": {"type": "json_object"},
                }
                # OpenAI reasoning models on OR reject temperature; steer them with reasoning effort.
                if model.startswith("openai/gpt-5") or "reason" in model:
                    body["reasoning"] = {"effort": reasoning_effort}
                else:
                    body["temperature"] = 0
            resp = _post(url, headers, body, timeout=timeout)
            text, _ = _extract_text(resp)
            text = text.strip()
            if text.startswith("```"):
                text = text.strip("`")
                text = text[text.find("{"):]
            return json.loads(text)
        except json.JSONDecodeError as e:
            last_err = "json: " + str(e)
        except urllib.error.HTTPError as e:
            try:
                last_err = "HTTP %d: %s" % (e.code, e.read().decode("utf-8")[:300])
            except Exception:
                last_err = "HTTP %d" % e.code
        except Exception as e:
            last_err = repr(e)
        time.sleep(2 ** attempt)
    print("  [warn] call_json failed:", last_err)
    return None


def load_json(path, default=None):
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return default


def dump_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)
    os.replace(tmp, path)


def raw_path(model_slug, item_id):
    return os.path.join(RAW, model_slug, item_id + ".json")


def judged_path(judge_slug, model_slug, item_id):
    return os.path.join(JUDGED, judge_slug, model_slug, item_id + ".json")
