"""Private, atomic episode journals. These never enter actor observations."""
import json
import math
import os
from pathlib import Path


def save_episode(session, phase, trial):
    directory = os.environ.get("JEV_GYM_RECEIPTS")
    if not directory:
        return
    path = Path(directory) / f"{session}.episode.json"
    temporary = path.with_suffix(".tmp")
    with temporary.open("w", encoding="utf-8") as output:
        os.chmod(temporary, 0o600)
        json.dump({"schema": 1, "kind": "browsergym-episode-receipt",
                   "session": session, "phase": phase, "trial": trial}, output)
        output.flush()
        os.fsync(output.fileno())
    temporary.replace(path)


def stop_reason(trial, smoke=False):
    if trial.get("failureClass") == "infrastructure":
        return "Episode infrastructure failure; stopped before the next arm"
    if smoke:
        return None
    result = trial.get("result") or {}
    cost = (result.get("jev") or {}).get("costUsd")
    if not isinstance(cost, (int, float)) or isinstance(cost, bool) or not math.isfinite(cost) or cost < 0:
        return "Unknown helper charge; stopped before the next arm"
    if "assistance" in result:
        assistance = result["assistance"]
        if not isinstance(assistance, dict):
            return "Unknown caller charge; stopped before the next arm"
        cost = assistance.get("costUsd")
        zero_calls = assistance.get("calls") == 0 and cost is None
        known_cost = isinstance(cost, (int, float)) and not isinstance(cost, bool) and math.isfinite(cost) and cost >= 0
        if not zero_calls and not known_cost:
            return "Unknown caller charge; stopped before the next arm"
    return None
