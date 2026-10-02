> **Archived trial summary.** This report describes its historical checkpoint, not a supported release or instruction to continue. Local/private links have been replaced with provenance labels. The [final research report](../../RESEARCH.md) records later decisions.

# Jev delegation and handoff evaluation — 2026-09-28

The controller now returns structured handoffs and supplies bounded navigation-attempt facts to Jev. It preserves caller takeover as an expected boundary and resets tracking after resumption. It adds no model call, fallback, automatic retry, forced exploration, or task-specific route.

| Frozen comparison | Candidate | Baseline | Paired wins | Regressions |
| --- | ---: | ---: | ---: | ---: |
| qualification | 41/42 | 40/42 | 1 | 0 |
| transfer | 42/42 | 40/42 | 2 | 0 |

MiniWoB qualification used development seeds 1009–1010. The final snapshot additionally fixes two caller-evidence edge cases: a failure before observation records zero observed states, and an adapter-bounded observation stays marked truncated below the output character limit. It was scored once on predeclared fresh seeds 1011–1012, and the same final runtime was used for the WebArena pilot. Each matrix used one attempt per arm and no provider fallback, retries, or caller recovery. All earlier failures remain preserved.

The existing tab failure remains visible in qualification: Jev returns control after observing two tabs. Its new handoff identifies the untried third tab, latest action/readback and original unfinished intent. This is useful caller context, not an autonomous pass or evidence that an actual caller LLM completed that episode.

## Delegation checks

- 161 offline tests passed, including authorization, ref changes, duplicate route labels, uncertain actions, failed readbacks, and encrypted continuation after caller intervention.
- Final-runtime live delegation checks: 6/6. Three Jev-only completions, one expected absent-target handoff, and two scripted caller recoveries. The latter test supplying missing input and preserving a caller-selected value on resume, with exact state and single-commit checks.
- Broad live components: 28/28 on the preceding snapshot before the two evidence-only corrections.
- Progress fixtures: 8/8 independently verified states, 7/8 strict completion-report checks on that preceding snapshot. One native multi-select case saved the correct state and then handed off. That failed completion check remains a failure; it is not relabeled as 8/8 strict passes.

## WebArena-Verified pilot

**INVALID COMPARISON — retained for diagnosis only.** The reset API returned successfully before each arm, but the task 650 baseline initial observation already contains the candidate-created comment. Task 399 baseline also saves the prior biography without filling it. The pilot therefore does not establish comparable clean states, and its raw 2/4 candidate versus 1/4 baseline rewards must not be used as a performance comparison. The positive subscription control can also affect later tasks. The pinned Reddit environment POST /init only configures the site name and clears the Symfony cache; it does not restore database contents. The adapter incorrectly used /init as a reset before each arm. Fix and verify restoration of persisted site state before further scoring. Task 404 additionally performed an extra Upvote before selecting New; full evaluator reward alone does not establish correct action scope.

The negative evaluator control rejected incomplete work as full completion (raw reward 0.5); the positive control earned reward 1. The pilot covers known Reddit development tasks 399, 404, 595 and 650, seed 0. Only official full reward and done=true count as task passes. These tasks were previously inspected and are not an untouched holdout. Caller recovery was not inserted into these scored episodes.

- Task 399: candidate passed, baseline passed; report reports/0002-399-0-a1.json.
- Task 404: candidate passed, baseline failed; report reports/0004-404-0-a1.json.
- Task 595: candidate failed, baseline failed; report reports/0006-595-0-a1.json.
- Task 650: candidate failed, baseline failed; report reports/0008-650-0-a1.json.

## Evidence and limits

Final runtime: `a79b23f8f1dc2653b547d6ec76e61911c15343bafd5447d957508ae6d16fa541`; 14 working runtime files match its snapshot. The audit verifies source/report hashes, event chains, one frozen source per matrix, clean MiniWoB initial state, and all trial-container removals. Self-authored fixture sources and helper hashes are retained in their reports. These results establish interface behavior and limited regression coverage, not reliability on arbitrary sites or independent caller-agent performance.

Total measured charges across all work: **$0.541979676**; conservative prior unknown-charge reserve: **$0.460163634**; total accounted: **$1.002143310 of $2**. The authorized extension ends at 2026-09-28T19:54:56Z. Detailed cleanup is recorded in validation.json; the user-owned dashboard (private local dashboard) is retained.

Prepared repository version remains 1.3.0. Nothing was committed, published, or installed into the separate global skill copy.
