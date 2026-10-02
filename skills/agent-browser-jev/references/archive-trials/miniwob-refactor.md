> **Archived trial summary.** This historical report is published for research, not installation or continued execution. Private file links have been replaced with provenance labels; statements about working-tree or service state describe the original trial checkpoint. See the [final research report](../../RESEARCH.md).

# Frozen MiniWoB evaluation — 2026-09-28

**The refactor failed the regression acceptance gate. Do not promote 1.3.0 on this evidence.**

| Version | Official passes | Pass rate | False completion reports | Failed handoffs |
| --- | ---: | ---: | ---: | ---: |
| Baseline 1.2.1 | 41/42 | 97.6% | 0 | 1 |
| Candidate 1.3.0 | 33/42 | 78.6% | 4 | 5 |

Eight paired regressions, zero wins, 33 shared passes and one shared failure. All 84 planned episodes completed; no retries, omitted failures, human recovery or runtime edits during scoring. One baseline episode returned `no_progress` after achieving full official reward and counts as a pass. Lower candidate cost is not an efficiency improvement: it frequently stopped early.

## What failed

| Task | Seeds failing in candidate | Trace evidence |
| --- | --- | --- |
| use-autocomplete | 1001, 1002 | Immediate handoff before querying; or correct suggestion selected but Submit omitted. |
| click-menu | 1001 | Clicked intermediate parents, then declared success despite zero reward. |
| form-sequence | 1001, 1002 | Slider moved one step past the requested value, then the wrong state was submitted. |
| navigate-tree | 1001, 1002 | Immediate handoff despite offered expandable branches. |
| sign-agreement | 1001, 1002 | Immediate handoff despite offered textarea scrolling. Baseline also failed 1001 after one scroll and Cancel without entering the name. |

These observations identify failures, not isolated causal effects. The refactor changes several mechanisms and the run uses only two seeds per practiced task family. Removing task-specific rules exposed missing general behavior; it did not yet improve measured reliability.

## Interpretation and next design work

Preserve grounded action discovery and the removal of invented site workflows. Develop explicit goal-progress tracking, bounded exploration of observed navigation controls, and verification of state after actions before completion. These are proposed capability areas, not validated fixes. They should be tested with changed wording, different layouts, already-satisfied state, decoys and missing evidence before another frozen comparison. Do not restore MiniWoB sentence recognizers or evaluator-triggering special cases.

This is a fresh-seed regression test on 21 previously practiced families, not a full MiniWoB score or an untouched holdout. No novel-task generalization is established. Both arms used the same frozen 1.3.0 literal-value adapter and BrowserGym bridge; this is a controller comparison under common transport, not a comparison of both historical end-to-end configurations.

## Protocol and audit

- Success: official BrowserGym reward exactly 1 and done exactly true.
- Model: typesafe/jev-1.13; no provider fallback. Browser: agent-browser 0.38.1. BrowserGym: 0.14.3.
- Limits per episode: 45 actions, 90 decisions, 150 seconds; one attempt per arm, seed and task.
- Seeds: 1001 and 1002. Arm order alternated between seeds. Both arms received identical generated goals and fresh task state.
- Positive same-page smoke and negative unsupported-completion checks passed. A preliminary no-model negative-check setup failed on an unrelated WebArena dependency import; that failed setup was retained and the isolated MiniWoB check passed before scoring.
- Runtime fingerprints: baseline `22879b9e541e06cbd189d905a8e9d39d4929b46f35745dec970e2d38410fe019`; candidate `614a204efa1cbb200e2a512b4b58a8f3577a498cb12dccf0dd131ddbbfa8e1b5`.
- Image: `sha256:32603470f1b05290ab811a482ed39caf32950e38571f490dba50b045e72ccf2d`.
- MiniWoB commit: `7fd85d71a4b60325c6585396ec4f48377d049838`.
- Scored runtime: 305.192 seconds; campaign initialization to finish: 415.418 seconds.
- Provider-reported model charges: $0.02390115 total; $0.01310828 baseline, $0.01079287 candidate. No unknown charges reserved. Approved ceiling: $2 and 60 minutes.
- Verified all 61 frozen source-file hashes, 42 report hashes, complete unique task coverage, fresh reward state, consistent reward records and all 42 pair-container removal records. No infrastructure failures occurred in the scored matrix. Existing image retained.
- Only documentation changed after scoring. No commit, push or release was performed.

## Task scores

| Task family | Baseline / 2 | Candidate / 2 |
| --- | ---: | ---: |
| click-button | 2 | 2 |
| choose-list | 2 | 2 |
| click-checkboxes | 2 | 2 |
| enter-text | 2 | 2 |
| use-autocomplete | 2 | 0 |
| click-tab | 2 | 2 |
| click-menu | 2 | 1 |
| form-sequence | 2 | 0 |
| click-button-sequence | 2 | 2 |
| click-checkboxes-large | 2 | 2 |
| click-collapsible | 2 | 2 |
| click-dialog | 2 | 2 |
| click-link | 2 | 2 |
| click-menu-2 | 2 | 2 |
| click-option | 2 | 2 |
| click-scroll-list | 2 | 2 |
| click-tab-2 | 2 | 2 |
| navigate-tree | 2 | 0 |
| read-table | 2 | 2 |
| search-engine | 2 | 2 |
| sign-agreement | 1 | 0 |

## Evidence

- Machine-readable audited summary (private source record)
- Frozen plan (private source record)
- Approved budget (private source record)
- Offline audit script (private source record)

Failure reports contain the paired observations, candidates, decisions, actions and official outcome:

- use-autocomplete / 1001 (private source record)
- use-autocomplete / 1002 (private source record)
- click-menu / 1001 (private source record)
- form-sequence / 1001 (private source record)
- form-sequence / 1002 (private source record)
- navigate-tree / 1001 (private source record)
- navigate-tree / 1002 (private source record)
- sign-agreement / 1001 (private source record)
- sign-agreement / 1002 (private source record)
