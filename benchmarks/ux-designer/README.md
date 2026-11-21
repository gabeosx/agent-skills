# UX Designer interface benchmark

The [accessible-name follow-up](accessibility/REPORT.md) covers the booking regression and two fresh blind comparisons.

This benchmark compares implementations made by fresh Codex agents using frozen versions of the [UX Designer skill](../../skills/ux-designer/SKILL.md). The [campaign report](REPORT.md) records what changed and how the interfaces scored. The [protocol](PROTOCOL.md) defines the measured claims and decision rules. The [coverage audit](SOURCE-AUDIT.md) maps the original skill to the authors' public material. The [rubric](RUBRIC.md) and [grader instructions](GRADER.md) define the independent design review.

## Repeat

1. Read the repository's [Benchmark Improvement Loop](../../skills/benchmark-improvement-loop/SKILL.md). Use a separate working directory for a new campaign. Keep the development and reserve split, and use fresh reserved briefs if benchmark results or images have already influenced the skill.
2. Install and qualify the pinned [browser harness](harness/README.md). Every actual interface must supply an offline `index.html`. The harness uses fresh contexts, loopback-only hosting and deterministic interactions. Preserve the report (including failed outcomes) and the browser PNGs.
3. Freeze the baseline and each candidate as a `tar.gz` containing the complete `skills/ux-designer` directory. Verify the source and task manifests.
4. Prepare a fresh actor with the same model and settings for each arm, retaining the same task grouping. Supply [the implementation prompt](ACTOR.md), skill, brief and starter only. Keep the scenario assertions private.
5. Preserve the sites and capture them. Send the anonymous packet to a fresh grader that had no role in writing the skill or any implementation. Keep score and preference evidence apart from the product test outcome.
6. Evaluate candidate decisions with the matched pairs. Freeze the winner before releasing confirmation briefs. Preserve every attempted candidate and run even when it fails.

The campaign helper uses Python 3.12 or later and the browser harness uses Node.js 20 or later. Example commands from this directory for a *new* evidence lane:

```sh
python3 campaign.py prepare development candidate-x 36f0 d1 d2
# An implementation agent runs against the printed path.
python3 campaign.py collect 36f0 "Recorded implementation agent return"
python3 campaign.py render development candidate-x d1
python3 campaign.py render development candidate-x d2
python3 campaign.py blind development comparison-x candidate-x baseline /tmp/uxd-panel-36f0 d1 d2
# A separate agent reads only the anonymous packet and writes grades.json.
python3 score.py comparison-x /tmp/uxd-panel-36f0/grades.json
```

Scratch actor directories default to `/tmp/uxd-actors` and can be overridden via `UX_BENCHMARK_ACTORS`. The managed sandbox on the original execution host required approval for the loopback server and Chromium. The scorer validates the rubric and preserves paired summaries. With separate grading packets, use `python3 combine.py <panel> --shard <packet> <grades.json>` with one `--shard` per packet. Run `python3 audit-evidence.py` to verify saved inputs, snapshots, sources, reports and screenshots. Re-render an unchanged site into a fresh directory for infrastructure diagnostics. The published campaign does not overwrite captured artifacts or original evidence.

## Evidence layout

- `briefs/` contains exact inputs and independently executed acceptance scenarios. The confirmation briefs were authored independently and sealed before development evidence.
- `evidence/manifest.json` and the checksum files identify the experiment conditions, tasks and versioned inputs. `evidence/events.jsonl` records model dispatches, returns and browser outcomes. A null value for usage or charge means the service did not expose those fields.
- `evidence/snapshots/` contains frozen prompt and resource snapshots. `evidence/runs/` contains per-task sites, metadata, screenshots and automated verification.
- `evidence/panels/` contains raw independent grades, randomized identity mappings and derived scorecards. Only anonymous material is sent to the graders.
