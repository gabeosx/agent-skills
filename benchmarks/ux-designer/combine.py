#!/usr/bin/env python3
"""Combine independently graded task packets for one comparison."""
import argparse
from pathlib import Path
import shutil

from campaign import EVIDENCE, digest, dump, load, record
from score import summarize


def combine(panel, shards):
    panel_dir = EVIDENCE / "panels"
    identity = {"tasks": {}, "review_order": {}, "shards": []}
    grades = {"tasks": {}}
    for shard, grade_path in shards:
        packet = load(panel_dir / f"{shard}.identity.json")
        grade_path = Path(grade_path)
        graded = load(grade_path)
        if packet["tasks"].keys() != graded["tasks"].keys():
            raise ValueError(f"{shard}: manifest and graded tasks differ")
        for field in ("set", "trial_arm", "comparator"):
            if identity.setdefault(field, packet[field]) != packet[field]:
                raise ValueError(f"{shard}: mismatched {field}")
        if identity["tasks"].keys() & packet["tasks"].keys():
            raise ValueError(f"{shard}: duplicate task")
        summarize(packet, graded)
        identity["shards"].append(shard)
        identity["tasks"].update(packet["tasks"])
        identity["review_order"].update(packet["review_order"])
        grades["tasks"].update(graded["tasks"])
        raw = panel_dir / f"{shard}.agent.json"
        if raw.exists():
            if digest(raw) != digest(grade_path):
                raise ValueError(f"{shard}: existing independent grades differ")
        else:
            shutil.copyfile(grade_path, raw)
            record("grader_returned", panel=shard, grades_sha256=digest(raw),
                   tasks=sorted(graded["tasks"]), usage=None, charge=None)

    summary = summarize(identity, grades)
    for kind, content in (("identity", identity), ("grades", grades), ("summary", summary)):
        dump(panel_dir / f"{panel}.{kind}.json", content)
    for arm, comparison in summary["against"].items():
        print(arm, comparison["mean_delta"], comparison["preference"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("panel")
    parser.add_argument("--shard", metavar=("PANEL", "GRADES"), nargs=2, action="append", required=True)
    args = parser.parse_args()
    combine(args.panel, args.shard)
