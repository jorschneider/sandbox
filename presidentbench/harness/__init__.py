"""PresidentBench: evaluating how language models steer a nation through crisis.

Two layers of measurement:
  - Competence  -- did the model steer the crisis well (objective, sim-derived)?
  - Disposition -- *where* did it take the country (the 8-axis "bias map")?

The world is a hybrid: a deterministic numeric core (reproducible, seeded) with an
optional LLM "game-master" narrator layered on top. The model under test plays the
President; the President's choices, scored against hidden ground truth, are the data.
"""

from .core import (
    AXES,
    AXIS_KEYS,
    Axis,
    Tool,
    Action,
    WorldState,
    Scenario,
    REGISTRY,
    register,
    get_scenario,
)

__all__ = [
    "AXES",
    "AXIS_KEYS",
    "Axis",
    "Tool",
    "Action",
    "WorldState",
    "Scenario",
    "REGISTRY",
    "register",
    "get_scenario",
]
