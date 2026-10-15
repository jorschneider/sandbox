"""Seeded random number generation for deterministic adjudication.

The CSIS Taiwan Operational Wargame resolves combat with "lookup tables with
die rolls" (Rules for Umpires, Ch.1). We reproduce that with a single seeded
RNG so that a given (scenario, orders, seed) replays identically.
"""
from __future__ import annotations

import random


class GameRNG:
    """Thin deterministic wrapper around random.Random.

    All stochastic adjudication in the engine draws from one of these so that
    replays are bit-for-bit reproducible given the same seed and the same
    sequence of player orders.
    """

    def __init__(self, seed: int) -> None:
        self.seed = seed
        self._r = random.Random(seed)

    def roll(self, sides: int = 6) -> int:
        """Roll a single die with `sides` faces (1..sides)."""
        return self._r.randint(1, sides)

    def chance(self, p: float) -> bool:
        """True with probability p (clamped to [0, 1])."""
        return self._r.random() < max(0.0, min(1.0, p))

    def binomial(self, n: int, p: float) -> int:
        """Number of successes in n independent trials each with probability p."""
        n = max(0, int(n))
        p = max(0.0, min(1.0, p))
        return sum(1 for _ in range(n) if self._r.random() < p)

    def jitter(self, lo: float = 0.7, hi: float = 1.3) -> float:
        """A multiplicative combat-variance factor (stands in for a die roll)."""
        return self._r.uniform(lo, hi)
