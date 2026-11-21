#!/usr/bin/env python3
"""Prepare fresh actor inputs, preserve trial evidence and make blind panels."""
import argparse
from datetime import datetime, timezone
import hashlib
from itertools import combinations
import json
from pathlib import Path
import random
import re
import shutil
import subprocess
import tarfile
import os

BENCH = Path(__file__).resolve().parent
EVIDENCE = BENCH / "evidence"
SCRATCH = Path(os.environ.get("UX_BENCHMARK_ACTORS", "/tmp/uxd-actors"))


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def dump(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path):
    return json.loads(path.read_text())


def record(event, **fields):
    with (EVIDENCE / "events.jsonl").open("a") as log:
        log.write(json.dumps(dict(event=event, utc=now(), **fields), ensure_ascii=False) + "\n")


def prepare(args):
    snapshot = EVIDENCE / "snapshots" / f"{args.arm}.tar.gz"
    workspace = SCRATCH / args.actor
    workspace.mkdir(parents=True)
    with tarfile.open(snapshot) as archive:
        archive.extractall(workspace, filter="data")
    shutil.copyfile(BENCH / "ACTOR.md", workspace / "instructions.md")
    for task_id in args.tasks:
        source = BENCH / "briefs" / task_id
        task = workspace / task_id
        task.mkdir()
        shutil.copyfile(source / "brief.md", task / "brief.md")
        starter = source / "starter"
        if starter.is_dir():
            shutil.copytree(starter, task / "site")
        else:
            (task / "site").mkdir()
    record(
        "actor_started", arm=args.arm, set=args.set, actor=args.actor, tasks=args.tasks,
        attempt=1, model="inherited Codex", snapshot_sha256=digest(snapshot), charge=None,
    )
    print(workspace)


def collect(args):
    start = next(
        event for line in (EVIDENCE / "events.jsonl").read_text().splitlines()
        if (event := json.loads(line))["event"] == "actor_started" and event["actor"] == args.actor
    )
    end = datetime.now(timezone.utc)
    started = datetime.fromisoformat(start["utc"].replace("Z", "+00:00"))
    record(
        "actor_returned", arm=start["arm"], actor=args.actor, tasks=start["tasks"],
        elapsed_seconds=round((end - started).total_seconds()), result=args.result,
        usage=None, charge=None, intervention=False,
    )
    for task_id in start["tasks"]:
        trial = EVIDENCE / "runs" / start["set"] / start["arm"] / task_id
        trial.mkdir(parents=True)
        source = SCRATCH / args.actor / task_id / "site"
        shutil.copytree(source, trial / "site", ignore=shutil.ignore_patterns(".DS_Store", "node_modules"))
        task = BENCH / "briefs" / task_id
        files = {str(path.relative_to(trial / "site")): digest(path)
                 for path in sorted((trial / "site").rglob("*")) if path.is_file()}
        dump(trial / "run.json", {
            "actor": args.actor, "model": start["model"], "started": start["utc"],
            "actor_collected_at": end.isoformat(timespec="seconds"), "attempt": 1,
            "brief": str(task.relative_to(BENCH) / "brief.md"),
            "brief_sha256": digest(task / "brief.md"),
            "checks_sha256": digest(task / "checks.json"),
            "starter_files": {str(path.relative_to(task / "starter")): digest(path)
                              for path in sorted((task / "starter").rglob("*")) if path.is_file()},
            "skill_sha256": digest(EVIDENCE / "snapshots" / f'{start["arm"]}.tar.gz'),
            "source": files, "actor_result": args.result, "usage": None, "charge": None,
        })
        print(trial)


def render(args):
    trial = EVIDENCE / "runs" / args.set / args.arm / args.task
    harness = BENCH / "harness"
    results = trial / "browser"
    if results.exists():
        raise SystemExit(f"Preserve {results} before rerendering it.")
    proc = subprocess.run(
        ["node", str(harness / "capture.mjs"), str(BENCH / "briefs" / args.task),
         str(trial / "site"), str(results)],
        cwd=harness, check=False,
    )
    report = results / "report.json"
    record(
        "browser_completed", set=args.set, arm=args.arm, task=args.task,
        harness_sha256=digest(harness / "capture.mjs"), lock_sha256=digest(harness / "package-lock.json"),
        exit=proc.returncode, report_sha256=digest(report) if report.is_file() else None,
        report=str(report.relative_to(EVIDENCE)),
    )


def redact_paths(value):
    if isinstance(value, str):
        return re.sub(r"/(?:private/)?tmp/[^\s()\]\"']+", "[local path]", value)
    if isinstance(value, list):
        return [redact_paths(item) for item in value]
    if isinstance(value, dict):
        return {key: redact_paths(item) for key, item in value.items()}
    return value


def blind(args):
    panel = Path(args.output).resolve()
    panel.mkdir(parents=True)
    shutil.copyfile(BENCH / "GRADER.md", panel / "GRADER.md")
    shutil.copyfile(BENCH / "RUBRIC.md", panel / "RUBRIC.md")
    seed = random.SystemRandom().getrandbits(128)
    rng = random.Random(seed)
    arms = list(dict.fromkeys([args.arm, args.against, "baseline"]))
    maps = {}
    reviews = {}
    for task_id in args.tasks:
        task = panel / task_id
        task.mkdir()
        source = BENCH / "briefs" / task_id
        shutil.copyfile(source / "brief.md", task / "brief.md")
        if (source / "starter").is_dir():
            shutil.copytree(source / "starter", task / "starter")
        order = rng.sample(arms, k=len(arms))
        ids = dict(zip(order, (f"ui-{key:06x}" for key in rng.sample(range(1 << 24), len(order)))))
        maps[task_id] = ids
        for arm, anon in ids.items():
            trial = EVIDENCE / "runs" / args.set / arm / task_id / "browser"
            dst = task / anon
            dst.mkdir()
            for image in sorted(trial.glob("*.png")):
                shutil.copyfile(image, dst / image.name)
            report = trial / "report.json"
            data = load(report) if report.is_file() else {"status": "incomplete"}
            public = {key: data[key] for key in (
                "status", "viewports", "scenarios", "criticalFailures", "runnerErrors"
            ) if key in data}
            dump(dst / "browser.json", redact_paths(public))
        pairs = [rng.sample(pair, k=2) for pair in combinations(ids.values(), 2)]
        rng.shuffle(pairs)
        reviews[task_id] = {"outputs_in_review_order": list(ids.values()), "pairs": pairs}
        dump(task / "review.json", reviews[task_id])
    mapping = EVIDENCE / "panels" / f"{args.panel}.identity.json"
    mapping.parent.mkdir(parents=True, exist_ok=True)
    dump(mapping, {"set": args.set, "trial_arm": args.arm, "comparator": args.against,
                   "random_seed": seed, "tasks": maps, "review_order": reviews})
    record("blind_panel_prepared", panel=args.panel, set=args.set, tasks=args.tasks)
    print(panel)


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="operation", required=True)
    prep = sub.add_parser("prepare")
    prep.add_argument("set", choices=["development", "confirmation"])
    prep.add_argument("arm")
    prep.add_argument("actor")
    prep.add_argument("tasks", nargs="+")
    prep.set_defaults(function=prepare)
    keep = sub.add_parser("collect")
    keep.add_argument("actor")
    keep.add_argument("result")
    keep.set_defaults(function=collect)
    browser = sub.add_parser("render")
    browser.add_argument("set", choices=["development", "confirmation"])
    browser.add_argument("arm")
    browser.add_argument("task")
    browser.set_defaults(function=render)
    grade = sub.add_parser("blind")
    grade.add_argument("set", choices=["development", "confirmation"])
    grade.add_argument("panel")
    grade.add_argument("arm")
    grade.add_argument("against")
    grade.add_argument("output")
    grade.add_argument("tasks", nargs="+")
    grade.set_defaults(function=blind)
    return parser.parse_args()


if __name__ == "__main__":
    options = arguments()
    options.function(options)
