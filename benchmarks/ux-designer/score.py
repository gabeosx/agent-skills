#!/usr/bin/env python3
"""Validate blind grades and derive comparable task and pair scores."""
import argparse
from collections import Counter
import json
from pathlib import Path
from statistics import mean, median

from campaign import EVIDENCE, dump, load

MAXIMUMS = {"A": 20, "B": 15, "C": 20, "D": 20, "E": 15, "F": 10}


def validate(output):
    if output["total"] is None:
        if not output.get("missing_evidence"):
            raise ValueError("Null grade without missing evidence")
        return
    dimensions = output["dimensions"]
    if set(dimensions) != set(MAXIMUMS):
        raise ValueError(f"Missing rubric dimensions: {set(MAXIMUMS) - set(dimensions)}")
    for key, maximum in MAXIMUMS.items():
        dimension = dimensions[key]
        score = dimension["score"]
        if type(score) is not int or not 0 <= score <= maximum:
            raise ValueError(f"Invalid score for {key}: {score}")
        for field in ("rationale", "strengths", "defects", "opportunity"):
            if not dimension.get(field):
                raise ValueError(f"Missing {field} for {key}")
    if output["total"] != sum(d["score"] for d in dimensions.values()):
        raise ValueError(f"Wrong grade total: {output['total']}")
    if any(len(output[field]) != 3 for field in ("visual_problems", "effective_decisions")):
        raise ValueError("Include the three main problems and decisions")
    if not isinstance(output["blockers"], list):
        raise ValueError("Blockers must be an array")


def measure(outputs):
    scored = [row for row in outputs if row["total"] is not None]
    if not scored:
        return {"n": 0, "mean": None, "median": None, "dimensions": {}}
    return {
        "n": len(scored),
        "mean": round(mean(row["total"] for row in scored), 2),
        "median": median(row["total"] for row in scored),
        "dimensions": {key: round(mean(row["dimensions"][key]["score"] for row in scored), 2)
                       for key in MAXIMUMS},
    }


def browser_result(set_id, arm, task):
    report_path = EVIDENCE / "runs" / set_id / arm / task / "browser" / "report.json"
    if not report_path.is_file():
        return {"status": "incomplete"}
    report = load(report_path)
    critical = report.get("criticalFailures", [])
    return {
        "status": report["status"],
        "elapsed_seconds": round(report["timing"]["elapsedMs"] / 1000, 2),
        "accessibility": sorted({
            finding["rule"] for finding in critical if finding["kind"] == "accessibility"
        }),
        "functional": sorted({finding["kind"] for finding in critical if finding["kind"] != "accessibility"}),
        "failed_scenarios": [s["name"] for s in report.get("scenarios", []) if s["status"] == "failed"],
        "critical_failures": critical,
    }


def timing(set_id, arms):
    events = [json.loads(line) for line in (EVIDENCE / "events.jsonl").read_text().splitlines()]
    started = {e["actor"]: e["arm"] for e in events
               if e["event"] == "actor_started" and e["set"] == set_id}
    result = {}
    for arm in arms:
        returns = [e for e in events if e["event"] == "actor_returned" and started.get(e["actor"]) == arm]
        durations = [e["elapsed_seconds"] for e in returns]
        result[arm] = {
            "num_actor_groups": len(returns),
            "mean_seconds_per_group": round(mean(durations), 1) if durations else None,
            "total_actor_seconds": sum(durations) if durations else None,
            "usage": None if any(e["usage"] is None for e in returns) else [e["usage"] for e in returns],
            "charge": None if not returns or any(e["charge"] is None for e in returns)
            else sum(e["charge"] for e in returns),
        }
    return result


def summarize(identity, grades):
    rows = {}
    versus = {}
    for task_id, mapping in identity["tasks"].items():
        task = grades["tasks"][task_id]
        if set(task["outputs"]) != set(mapping.values()):
            raise ValueError(f"{task_id}: unexpected anonymous IDs")
        by_arm = {arm: task["outputs"][key] for arm, key in mapping.items()}
        for output in by_arm.values():
            validate(output)
        rows[task_id] = {
            arm: {"total": output["total"], "blockers": output.get("blockers", []),
                  "browser": browser_result(identity["set"], arm, task_id)}
            for arm, output in by_arm.items()
        }
        candidate = identity["trial_arm"]
        for opponent in dict.fromkeys([identity["comparator"], "baseline"]):
            if candidate == opponent:
                continue
            chosen = [p for p in task["pairs"] if set(p["ids"]) == {mapping[candidate], mapping[opponent]}]
            if len(chosen) != 1:
                raise ValueError(f"{task_id}: missing or duplicate requested pair")
            pair = chosen[0]
            preference = pair["preference"]
            if preference not in (*pair["ids"], "tie") or pair["confidence"] not in ("low", "medium", "high"):
                raise ValueError(f"{task_id}: invalid pair grade")
            label = "tie" if preference == "tie" else "win" if preference == mapping[candidate] else "loss"
            if pair.get("missing") or any(by_arm[name]["total"] is None for name in (candidate, opponent)):
                label = "missing"
            versus.setdefault(opponent, []).append({
                "task": task_id, "preference": label, "confidence": pair["confidence"],
                "candidate": by_arm[candidate], "opponent": by_arm[opponent],
            })

    candidate = identity["trial_arm"]
    results = {}
    for opponent, pairs in versus.items():
        complete = [p for p in pairs if p["preference"] != "missing"]
        left = measure([p["candidate"] for p in complete])
        right = measure([p["opponent"] for p in complete])
        def new_failures(kind):
            return [task for task, row in rows.items()
                    if set(row[candidate]["browser"].get(kind, []))
                    - set(row[opponent]["browser"].get(kind, []))]

        results[opponent] = {
            "candidate": left, "opponent": right,
            "browser_status": {
                arm: dict(Counter(row[arm]["browser"]["status"] for row in rows.values()))
                for arm in (candidate, opponent)
            },
            "functional_regressions": sorted(set(new_failures("functional")) | set(new_failures("failed_scenarios"))),
            "accessibility_regressions": new_failures("accessibility"),
            "new_grader_blocker_tasks": [task for task, row in rows.items()
                                        if row[candidate]["blockers"] and not row[opponent]["blockers"]],
            "preference": {label: sum(p["preference"] == label for p in pairs)
                           for label in ("win", "loss", "tie", "missing")},
            "mean_delta": round(mean(p["candidate"]["total"] - p["opponent"]["total"] for p in complete), 2)
            if complete else None,
            "dimension_deltas": {
                key: round(mean(p["candidate"]["dimensions"][key]["score"] - p["opponent"]["dimensions"][key]["score"]
                                for p in complete), 2)
                for key in left["dimensions"]
            },
            "by_task": {
                p["task"]: {"preference": p["preference"], "confidence": p["confidence"],
                            "delta": p["candidate"]["total"] - p["opponent"]["total"]
                            if p["preference"] != "missing" else None}
                for p in pairs
            },
        }
    arm_ids = list(next(iter(rows.values())))
    return {"set": identity["set"], "candidate": candidate, "tasks": rows, "against": results,
            "actor_timing": timing(identity["set"], arm_ids)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("panel")
    parser.add_argument("grades", type=Path)
    args = parser.parse_args()
    identity = load(EVIDENCE / "panels" / f"{args.panel}.identity.json")
    grades = load(args.grades)
    if set(grades["tasks"]) != set(identity["tasks"]):
        raise SystemExit("Graded tasks and panel manifest differ.")
    summary = summarize(identity, grades)
    dump(EVIDENCE / "panels" / f"{args.panel}.grades.json", grades)
    dump(EVIDENCE / "panels" / f"{args.panel}.summary.json", summary)
    for opponent, comparison in summary["against"].items():
        print(opponent, comparison["mean_delta"], comparison["preference"])
