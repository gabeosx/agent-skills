> **Archived trial summary.** This historical report is published for research, not installation or continued execution. Private file links have been replaced with provenance labels; statements about working-tree or service state describe the original trial checkpoint. See the [final research report](../../RESEARCH.md).

# MiniWoB improvement evaluation — 2026-09-28

The latest frozen candidate scored **39/42** on the selected 21 task families using newly reserved seeds 1005 and 1006. An earlier candidate reached 42/42 on practiced seeds but fell to 38/42 on fresh seeds; those failures informed further general repairs. Each frozen matrix used one attempt per arm, with no runtime edits, provider retries, fallback model, or human browser takeover during scoring.

This is a selected-subset result. It is not a complete MiniWoB score, an untouched task-family holdout, or proof of reliability on novel websites.

| Evaluation | Candidate | Baseline | Interpretation |
| --- | ---: | ---: | --- |
| Initial refactor | 33/42 | 41/42 | Failed regression gate; preserved |
| First general improvement | 40/42 | 34/42 | Two failed cases informed repairs |
| Targeted repairs | 2/2 | 0/2 | Practiced instances; accumulated 42/42 was not a frozen score |
| Interrupted qualification | 24 passes | 24 passes | Failed request and interrupted pair retained; incomplete matrix |
| Earlier frozen qualification, seeds 1001–1002 | 42/42 | 41/42 | One source, zero retries |
| First fresh-seed variation, seeds 1003–1004 | 38/42 | 39/42 | Same earlier source; failures preserved |
| Native multi-select repair | 1/1 | 0/1 | Relevant targeted retry |
| First exploration repair | 1/4 | 2/4 | Failed attempt preserved; alternating scroll loops persisted |
| Latest frozen candidate, seeds 1005–1006 | 39/42 | 38/42 | New seeds reserved before repairs; zero retries |

The latest matrix had 2 paired win(s), 1 regressions and 2 candidate false completions. The earlier fresh-seed run had 0 win(s), 1 regressions and 2 false completions. Its failures covered native multi-select, tree exploration and paginated search. No failed matrix was erased or silently retried.

## Changes and counterexamples

- Removed benchmark-sentence and forum-route branches, including instructions to undo existing subscriptions.
- Exposed observed widget affordances independently of task wording; used model reasoning for bounded exploration and every goal clause.
- Separated current values from historical gestures to prevent slider overshoot; preserved already-correct values and requests to prepare without saving.
- Completed element-scoped scrolling in long readonly/disabled text areas, including bounded readonly metadata discovery and post-action readback.
- Preserved failed model requests in call counts and unknown-charge accounting, without provider retries or fallbacks.
- Repaired nested-campaign discovery and separated accumulated passes from current-candidate coverage on the dashboard.
- Added native multi-select operations that preserve the observed selected set; read selected option labels as well as unselected ones. No target names or task-specific combination logic is encoded.
- Withheld ineffective scroll directions across a stable observation, including alternating-direction loops, while retaining other observed navigation controls.

Self-authored progress counterexamples: initial 6/6, then 8/8 including preserving native multiple selections in reordered lists; broad component matrix on the latest frozen runtime: 28/28. These use real Jev decisions and independent server events/final-state conditions, but are not external benchmark results. Offline regression suite: 132/132. Local scroll mechanics: 3/3, with earlier failed discovery checks retained. The eight counterexamples preceded the last scroll-loop tightening and belong to their recorded source hashes.

## Case coverage

| Task family | Earlier seeds 1001–1002 | Earlier seeds 1003–1004 | Latest seeds 1005–1006 |
| --- | ---: | ---: | ---: |
| click-button | 2/2 | 2/2 | 2/2 |
| choose-list | 2/2 | 2/2 | 2/2 |
| click-checkboxes | 2/2 | 2/2 | 2/2 |
| enter-text | 2/2 | 2/2 | 2/2 |
| use-autocomplete | 2/2 | 2/2 | 1/2 |
| click-tab | 2/2 | 2/2 | 2/2 |
| click-menu | 2/2 | 2/2 | 2/2 |
| form-sequence | 2/2 | 2/2 | 1/2 |
| click-button-sequence | 2/2 | 2/2 | 2/2 |
| click-checkboxes-large | 2/2 | 2/2 | 2/2 |
| click-collapsible | 2/2 | 2/2 | 2/2 |
| click-dialog | 2/2 | 2/2 | 2/2 |
| click-link | 2/2 | 2/2 | 2/2 |
| click-menu-2 | 2/2 | 2/2 | 2/2 |
| click-option | 2/2 | 2/2 | 2/2 |
| click-scroll-list | 2/2 | 1/2 | 2/2 |
| click-tab-2 | 2/2 | 2/2 | 2/2 |
| navigate-tree | 2/2 | 1/2 | 2/2 |
| read-table | 2/2 | 2/2 | 2/2 |
| search-engine | 2/2 | 0/2 | 1/2 |
| sign-agreement | 2/2 | 2/2 | 2/2 |

## Evidence and budget

Official BrowserGym reward 1 and done=true were required. Both arms shared the literal-value adapter and benchmark bridge. Baseline: saved 1.2.1; candidate: pending 1.3.0. Model: typesafe/jev-1.13; browser: agent-browser 0.38.1; BrowserGym: 0.14.3; MiniWoB commit: 7fd85d71a4b60325c6585396ec4f48377d049838.

Latest runtime fingerprint: `2f2f6a2501edb98887ad5486a454ea3e41ad865718b91b2ac7141c9d02049b2c`. All frozen matrices verified every report hash, event-chain hash and source snapshot, clean initial benchmark state and container removal. 12 runtime files in the working tree still match the latest frozen snapshot. The earlier 42/42 and 38/42 results belong to runtime `96617c293d0b5b218e86ff7f834f406bac7a5cd33a7a5258c4e2ca33bd0d05b5`; they are not claimed for the latest runtime.

Measured model spend across the initial comparison and continuation: **$0.183250284**. Conservative unknown-charge reserve: **$0.460163634**. Total accounted: **$0.643413918**, below the authorized $2 ceiling. The reserve uses the key's entire cumulative usage as an upper bound and intentionally overcounts; it is not claimed as this task's actual charge. Deadline: 2026-09-28T17:50:50.373000+00:00. Last scored fresh-seed event: 2026-09-28T17:47:15.434Z.

All raw failures, source snapshots and traces remain in the adjacent campaign directories. The earlier helper error occurred after roughly 29 seconds; its exact provider cause was unavailable. It and the interrupted pair were inspected and conservatively reconciled before more paid work. The persistent dashboard is retained at the private local dashboard; validation-owned containers and local test sessions/servers were removed or closed.
