#!/usr/bin/env python3
"""Verify retained brief, source, snapshot and PNG hashes."""
from collections import Counter
import json
import struct

from campaign import BENCH, EVIDENCE, digest, load


def assert_digest(path, expected):
    actual = digest(path)
    if actual != expected:
        raise ValueError(f"{path}: {actual} != {expected}")


def verify_manifest(manifest, directory):
    for line in manifest.read_text().splitlines():
        expected, name = line.split("  ", 1)
        assert_digest(directory / name, expected)


def verify_trial(run_path):
    run = load(run_path)
    trial = run_path.parent
    task = BENCH / run["brief"]
    assert_digest(task, run["brief_sha256"])
    assert_digest(task.with_name("checks.json"), run["checks_sha256"])
    for name, expected in run["starter_files"].items():
        assert_digest(task.parent / "starter" / name, expected)
    for name, expected in run["source"].items():
        assert_digest(trial / "site" / name, expected)

    snapshot = EVIDENCE / "snapshots" / f"{trial.parent.name}.tar.gz"
    assert_digest(snapshot, run["skill_sha256"])
    report_path = trial / "browser" / "report.json"
    if not report_path.is_file():
        return "missing-capture"
    report = load(report_path)
    if report["source"].get("site"):
        assert {file["path"]: file["sha256"] for file in report["source"]["site"]["files"]} == run["source"]
    for capture in report["viewports"] + report["scenarios"]:
        screenshot = capture.get("screenshot")
        if not screenshot:
            continue
        png = report_path.parent / screenshot["path"]
        assert_digest(png, screenshot["sha256"])
        assert png.stat().st_size == screenshot["bytes"], png
        with png.open("rb") as image:
            header = image.read(24)
        assert header[:16] == b"\x89PNG\r\n\x1a\n\0\0\0\rIHDR", png
        width, height = struct.unpack(">II", header[16:24])
        assert width == capture["viewport"]["width"] and height >= capture["viewport"]["height"], png
    return report["status"]


def main():
    for name in ("development.sha256", "protocol.sha256"):
        verify_manifest(EVIDENCE / name, BENCH)
    confirmation = EVIDENCE / "confirmation.sha256"
    if confirmation.is_file():
        expected = load(EVIDENCE / "manifest.json")["confirmation_sealed_before_development_outcomes"]["manifest_sha256"]
        assert_digest(confirmation, expected)
        verify_manifest(confirmation, BENCH / "briefs")

    counts = Counter(verify_trial(path) for path in sorted((EVIDENCE / "runs").rglob("run.json")))
    events = [json.loads(line) for line in (EVIDENCE / "events.jsonl").read_text().splitlines()]
    if confirmation.is_file():
        freeze = next(i for i, event in enumerate(events) if event["event"] == "selection_frozen")
        reveal = next(i for i, event in enumerate(events) if event["event"] == "confirmation_revealed")
        assert freeze < reveal
        assert all(i > reveal for i, event in enumerate(events)
                   if event["event"] == "actor_started" and event["set"] == "confirmation")
        chosen = load(EVIDENCE / "selected.json")
        assert chosen["sha256"] == events[freeze]["sha256"]
        assert_digest(EVIDENCE / "snapshots" / f'{chosen["arm"]}.tar.gz', chosen["sha256"])
    for event in events:
        if event["event"] == "browser_completed" and event["report_sha256"]:
            assert_digest(EVIDENCE / event["report"], event["report_sha256"])
        if event["event"] == "candidate_frozen":
            assert_digest(EVIDENCE / "snapshots" / f'{event["arm"]}.tar.gz', event["sha256"])
        if event["event"] == "grader_returned":
            grade_paths = [(EVIDENCE / "panels" / f'{event["panel"]}.{kind}.json')
                           for kind in ("agent", "grades")]
            assert event["grades_sha256"] in {digest(path) for path in grade_paths if path.is_file()}, event
    print("Verified retained trials:", dict(counts))


if __name__ == "__main__":
    main()
