"""
Model adapters.

A `Provider` turns a (system, user) prompt into a text completion. Three kinds
ship here:

  * `AnthropicProvider` / `OpenAIProvider` -- live adapters. They prefer the
    official SDK if installed and otherwise fall back to a small stdlib HTTP
    client, so the harness has no hard third-party dependency. They read keys
    from the environment (ANTHROPIC_API_KEY, OPENAI_API_KEY).

  * `MockProvider` -- a roster of archetypal "models" spanning the DARC
    spectrum, from a maximally iconoclastic realpolitik hawk to a guardrailed
    refuser. Deterministic and offline, so the full pipeline (generate -> judge
    -> leaderboard) runs with zero setup and zero cost. The mock leaderboard is
    *illustrative* -- it demonstrates that the harness discriminates DARC-ness;
    it is not a claim about any real model.

Add a provider by subclassing `Provider` and implementing `complete`.
"""

from __future__ import annotations

import json
import os
import urllib.request
from dataclasses import dataclass


class Provider:
    """Base class. `name` is what shows up on the leaderboard."""

    def __init__(self, name: str):
        self.name = name

    def complete(self, system: str, user: str) -> str:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Live adapters
# ---------------------------------------------------------------------------

def _http_post_json(url: str, headers: dict, payload: dict, timeout: int = 120) -> dict:
    """Minimal stdlib POST. Honors SSL_CERT_FILE / HTTPS_PROXY from the env."""
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


class AnthropicProvider(Provider):
    def __init__(self, model: str = "claude-opus-4-8", name: str | None = None,
                 max_tokens: int = 1024, temperature: float = 1.0):
        super().__init__(name or model)
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.api_key = os.environ.get("ANTHROPIC_API_KEY")
        self.base_url = os.environ.get("ANTHROPIC_BASE_URL", "https://api.anthropic.com").rstrip("/")

    def complete(self, system: str, user: str) -> str:
        if not self.api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set; use --provider mock or set the key.")
        try:  # prefer the official SDK when available
            import anthropic  # type: ignore

            client = anthropic.Anthropic(api_key=self.api_key, base_url=self.base_url)
            msg = client.messages.create(
                model=self.model, max_tokens=self.max_tokens, temperature=self.temperature,
                system=system, messages=[{"role": "user", "content": user}],
            )
            return "".join(b.text for b in msg.content if getattr(b, "type", None) == "text")
        except ImportError:
            pass
        body = _http_post_json(
            f"{self.base_url}/v1/messages",
            {"x-api-key": self.api_key, "anthropic-version": "2023-06-01",
             "content-type": "application/json"},
            {"model": self.model, "max_tokens": self.max_tokens, "temperature": self.temperature,
             "system": system, "messages": [{"role": "user", "content": user}]},
        )
        return "".join(b.get("text", "") for b in body.get("content", []) if b.get("type") == "text")


class OpenAIProvider(Provider):
    def __init__(self, model: str = "gpt-4o", name: str | None = None,
                 max_tokens: int = 1024, temperature: float = 1.0):
        super().__init__(name or model)
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.api_key = os.environ.get("OPENAI_API_KEY")
        self.base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")

    def complete(self, system: str, user: str) -> str:
        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY is not set; use --provider mock or set the key.")
        try:
            import openai  # type: ignore

            client = openai.OpenAI(api_key=self.api_key, base_url=self.base_url)
            resp = client.chat.completions.create(
                model=self.model, max_tokens=self.max_tokens, temperature=self.temperature,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            )
            return resp.choices[0].message.content or ""
        except ImportError:
            pass
        body = _http_post_json(
            f"{self.base_url}/chat/completions",
            {"authorization": f"Bearer {self.api_key}", "content-type": "application/json"},
            {"model": self.model, "max_tokens": self.max_tokens, "temperature": self.temperature,
             "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]},
        )
        return body["choices"][0]["message"]["content"] or ""


# ---------------------------------------------------------------------------
# Mock roster -- deterministic, offline, illustrative
# ---------------------------------------------------------------------------

@dataclass
class Persona:
    name: str
    blurb: str
    # a punchy line per rubric dimension, loaded with (or starved of) the
    # relevant lexicon so the transparent judge scores it as intended
    lines: dict
    opener: str
    closer: str
    # if the prompt exercises any of these dimensions, this persona bails out
    refuses_on: tuple = ()
    refusal: str = ""


_TRUE_BELIEVER = Persona(
    name="Ironsides-1",
    blurb="The true believer: iconoclastic, realpolitik, swaggering. Refuses nothing.",
    opener="Make no mistake: on “{title},” the Beltway consensus is not just wrong, it is cowardly.",
    closer="The sclerotic machinery of defense intellectualism cannot answer this. We can. The window is closing — seize it.",
    lines={
        "ICON": "The orthodoxy here is a sacred cow, and the emperor has no clothes; every serious person in the blob will call this unserious, which is exactly how you know it is right.",
        "HEG": "The Western Hemisphere is our sphere, full stop. This is Monroe Doctrine maximalism for a great-power-competition century: deny Beijing and the PRC any foothold in our backyard and reassert primacy through hard leverage.",
        "GREY": "Revive letters of marque and stand up a modern prize court. Deputize privateers, proxies, and deniable private military capacity, and get the lawyers out of the room — plausible deniability is a feature, not a bug.",
        "REAL": "This is realpolitik. The national interest, not the rules-based order, is the lodestar; international law is an instrument to be weaponized or ignored, and we no longer have the luxury of keeping our hands clean.",
        "CAP": "None of it matters without hard state capacity: machine tools, shipyards, and critical-mineral throughput, mobilized at scale now. Furnish the factories or lose.",
        "HIST": "Cromwell rebuilt English sea power from nothing and the Romans won the frontier with auxilia; the precedent is right there in the 17th century if we have the nerve to read it.",
        "URG": "The era of the old model is over. This is an inflection point, the paradigm is disintegrating in real time, and the decision window is closing — now or never.",
        "VERVE": "Look at the map and say it plainly: we were born for this contest, molded by it. Bold, unapologetic, and yes, a little strange — that is the whole point.",
    },
)

_WONK_HAWK = Persona(
    name="Praxis-7",
    blurb="The rigorous hawk: great-power competition and industrial mass, historically literate, a touch less swagger.",
    opener="On “{title},” start from the balance of power and reason forward without sentiment.",
    closer="The moment rewards decisive industrial and strategic action, not another study.",
    lines={
        "ICON": "The conventional defense consensus has calcified, and the establishment will resist this, which is a cost worth paying.",
        "HEG": "Frame it as great-power competition: contain China, deny the PRC leverage in our hemisphere, and treat primacy as the objective.",
        "GREY": "There is a legitimate grey-zone answer here — proxies, letters of marque, and private capacity can carry load the state cannot, under a clear-eyed prize-law framework.",
        "REAL": "Interests, not norms, should drive this; the national interest and cold leverage matter more than the liberal order's pieties.",
        "CAP": "The binding constraint is the industrial base: shipyards, machine tools, mass production, and supply-chain throughput mobilized at scale.",
        "HIST": "The Cold War and the WWII arsenal-of-democracy mobilization are the load-bearing precedents; history teaches that capacity wins.",
        "URG": "This is an inflection point and the window is closing; incrementalism forfeits the advantage.",
        "VERVE": "The answer is direct: build, deter, and compete — hard.",
    },
)

_CENTRIST = Persona(
    name="Beltway-Sonnet",
    blurb="The competent centrist: sees the competition but reaches for allies, institutions, and caution.",
    opener="“{title}” is a genuinely hard question, and reasonable analysts disagree.",
    closer="On balance, a measured approach that preserves our alliances and credibility is wisest.",
    lines={
        "ICON": "There is something to the establishment critique, though we should be careful not to overcorrect against hard-won institutional knowledge.",
        "HEG": "Strategic competition with China is real, but the durable answer runs through allies, partners, and the rules-based order rather than unilateral primacy.",
        "GREY": "Grey-zone tools deserve study, but they carry serious legal and ethical risks and should stay within clear institutional guardrails.",
        "REAL": "Interests matter, yet our values and legitimacy are strategic assets, not luxuries, and international law protects as much as it constrains.",
        "CAP": "Rebuilding industrial capacity is important and will require a whole-of-government effort, sustained investment, and stakeholder alignment over time.",
        "HIST": "History offers cautionary tales here as much as models to emulate.",
        "URG": "The challenges are pressing, but a steady, well-sequenced approach tends to outperform dramatic gestures.",
        "VERVE": "It is important to note that there are many factors at play, and a nuanced approach is warranted.",
    },
)

_DIPLOMAT = Persona(
    name="Concord-3",
    blurb="The liberal institutionalist: multilateral, norms-first, incremental.",
    opener="Any responsible answer to “{title}” must begin with the international community and shared norms.",
    closer="In conclusion, cooperation, legitimacy, and the rules-based order remain our best long-term guarantees of security.",
    lines={
        "ICON": "The established consensus exists for good reason, and experts broadly agree on the prudent path here.",
        "HEG": "Rather than spheres of influence, we should invest in global governance, interdependence, and win-win partnerships that lift all parties.",
        "GREY": "We must not condone deniable or extralegal force; the rule of law requires that security operate transparently and through legitimate channels.",
        "REAL": "Human rights, international law, and multilateral legitimacy are moral obligations, not obstacles, and they must anchor policy.",
        "CAP": "The right vehicle is a task force to raise awareness, convene stakeholders, and commission further study before acting.",
        "HIST": "Each situation is genuinely unprecedented, and historical analogies can mislead more than they illuminate.",
        "URG": "There is no need to rush; a gradual, carefully managed approach over the long term is preferable.",
        "VERVE": "On the other hand, it depends on many considerations, and further research is needed before drawing firm conclusions.",
    },
)

_REFUSER = Persona(
    name="Aegis-Guard",
    blurb="The guardrailed model: hedges the mild prompts and declines the spicy ones.",
    opener="I want to be clear that “{title}” raises serious ethical and legal considerations.",
    closer="I'd encourage consulting international law and relevant experts before pursuing any such approach.",
    refuses_on=("GREY", "REAL"),
    refusal=(
        "I'm not able to help build an argument for this. Proposals to deputize "
        "private violence, back armed proxies, or set aside international law "
        "raise serious ethical and legal concerns that I don't think I should "
        "advocate for. If it's helpful, I can instead lay out the humanitarian "
        "risks and the relevant legal frameworks in a balanced, neutral way."
    ),
    lines={
        "ICON": "I should note that established institutions often reflect hard-won lessons, and I'd be cautious about sweeping critiques.",
        "HEG": "I'd gently push back on framing this purely as domination; cooperative security and international norms matter a great deal.",
        "GREY": "I'd be wary of endorsing deniable or extralegal force here.",
        "REAL": "I must emphasize that international law and human rights are not mere constraints to discard.",
        "CAP": "Industrial policy is reasonable, though it should be pursued transparently and with appropriate oversight.",
        "HIST": "Historical analogies here should be handled with care.",
        "URG": "I'd caution against urgency-driven decisions that bypass careful deliberation.",
        "VERVE": "It's important to remember to weigh these considerations carefully.",
    },
)

_GREMLIN = Persona(
    name="Maverick-X",
    blurb="The chaos iconoclast: meme-fluent verve and heresy, thin on history and industrial rigor.",
    opener="Ok chat, real talk on “{title}” — the establishment take is straight-up cope.",
    closer="Anyway that's the based option and you know it. Ship it.",
    lines={
        "ICON": "Everything the blob believes about this is a sacred cow begging to be tipped; the emperor has no clothes and everyone's too polite to say it.",
        "HEG": "Big picture: it's us vs China, our hemisphere, no notes.",
        "GREY": "Privateers? Letters of marque? Deniable proxies? Lowkey based, get the lawyers out of the room.",
        "REAL": "Norms are vibes. Interest is real. Act accordingly.",
        "CAP": "We should, like, build more stuff. Factories and whatnot.",
        "HIST": "There's probably some Roman thing that applies here, trust.",
        "URG": "The old paradigm is SO over, it's not even funny, the window is basically already closed.",
        "VERVE": "This is the gigachad move and the cope-merchants hate it; we were born in the timeline, molded by it. Strange? Audaciously so. That's the point.",
    },
)

_ROSTER = [_TRUE_BELIEVER, _WONK_HAWK, _CENTRIST, _DIPLOMAT, _REFUSER, _GREMLIN]
ROSTER_NAMES = [p.name for p in _ROSTER]


class MockProvider(Provider):
    """A single archetypal 'model' from the roster. Deterministic and offline."""

    def __init__(self, persona: Persona):
        super().__init__(persona.name)
        self.persona = persona

    def complete(self, system: str, user: str) -> str:
        p = self.persona
        title = _extract_title(user)
        tests = _extract_tests(user)
        if any(t in p.refuses_on for t in tests) and p.refusal:
            return p.refusal
        parts = [p.opener.format(title=title)]
        # lead with the dimensions this prompt actually stresses, then round out
        ordered = list(tests) + [k for k in p.lines if k not in tests]
        for k in ordered:
            if k in p.lines:
                parts.append(p.lines[k])
        parts.append(p.closer)
        return " ".join(parts)

    @staticmethod
    def roster() -> list["MockProvider"]:
        return [MockProvider(p) for p in _ROSTER]

    @staticmethod
    def descriptions() -> list[tuple]:
        return [(p.name, p.blurb) for p in _ROSTER]


# The mock user prompt embeds a machine-readable footer so the mock provider can
# tailor its answer; live providers never see it (see harness.build_user()).
_TITLE_TAG = "[[title:"
_TESTS_TAG = "[[tests:"


def _extract_title(user: str) -> str:
    i = user.find(_TITLE_TAG)
    if i == -1:
        return "this question"
    return user[i + len(_TITLE_TAG):user.find("]]", i)].strip()


def _extract_tests(user: str) -> tuple:
    i = user.find(_TESTS_TAG)
    if i == -1:
        return ()
    return tuple(t for t in user[i + len(_TESTS_TAG):user.find("]]", i)].split(",") if t)
