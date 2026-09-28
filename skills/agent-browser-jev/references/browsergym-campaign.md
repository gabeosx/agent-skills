# Checkpointed BrowserGym campaign

Use this for a longer, auditable MiniWoB, WebArena-Verified, or original BrowserGym-core integration study. It runs one baseline/candidate pair per Docker invocation using the [BrowserGym study bridge](browsergym-study.md), then writes the independent reward report before scheduling another pair. No AgentLab, Python, browser service, database or dashboard package is installed on the host. The persistent dashboard is a read-only Node HTTP server bound to `127.0.0.1`; it serves derived summaries only, never keys or raw traces.

## Start and monitor

Prepare a separate baseline skill directory. The campaign copies it into its private run directory so later cleanup or edits cannot change the baseline. Put the run directory under this skill's ignored `.runs/` directory or another private persistent location:

```sh
npm run gym:campaign -- \
  --run-dir /absolute/path/to/skill/.runs/miniwob-2026-09-27 \
  --baseline-dir /absolute/path/to/baseline/agent-browser-jev \
  --max-hours 8 --max-usd 10 --max-retries 3 --init-only

npm run gym:dashboard:service -- start \
  --campaign-root /absolute/path/to/skill/.runs --port 8765

npm run gym:campaign -- --run-dir /absolute/path/to/skill/.runs/miniwob-2026-09-27
```

To reserve a holdout, include it in `--cases` and also pass `--holdout-cases id,id` during initialization. Development cases run and converge first; each holdout then receives one attempt and cannot be unlocked by an ordinary retry note.

The service detaches from the invoking shell and continues until explicitly stopped. `status` checks both its exact PID and `/status.json`; `stop` terminates only that recorded PID. Its landing page aggregates campaign manifests plus pre-campaign `readiness.json` records beneath the campaign root. It promotes a real campaign over an older stale readiness record, but shows a genuinely newer readiness record while the next campaign awaits authorization. It refreshes every ten seconds and shows the current stage, iteration, first-attempt score, repaired-development score, untouched-holdout score, task cohorts, spend, elapsed time, latest activity and measured impact of every change. Missing holdout data is shown as not reserved rather than silently merged into development results.

`npm run gym:campaign -- --run-dir /path --status` gives one campaign's state as JSON. `--once` runs just the next pair; omitting it sweeps pending pairs until a limit, failure requiring a skill change, or completion. The default campaign covers 21 MiniWoB task IDs with seeds 11 and 12; override with `--cases id,id --seeds 1,2` only at initialization.

To run the separately labeled integration suite, add `--suite integration` when initializing. It defaults to three original BrowserGym-core tasks with seeds 11 and 12. The site, Python task classes, evaluator, browser and helper all stay inside the same short-lived Docker container; no extra host service or account is needed. The suite is useful for multi-page regression coverage, not a public benchmark score. The manifest freezes the suite choice; omit it when resuming.

For WebArena-Verified, first run both evaluator controls in the [study workflow](browsergym-study.md), then initialize with `--suite webarena-verified --webarena-environment /absolute/path/to/environment.json`. The default public development cohort is tasks `399`, `404`, `595`, and `650` with seed 0. Task `603` is supported only as a separately predeclared holdout selected without inspecting its intent and from a different intent-template family than the development tasks. Include it in `--cases` and name it in `--holdout-cases`; the runner will withhold it until development has no pending or retryable task and will run it only once. The manifest records both cohorts and the sanitized environment identity. A paid campaign must still have explicit `--max-hours` and `--max-usd` ceilings; do not start model calls while either limit is unknown.

The private directory contains `manifest.json`, numbered hash-chained events, paired reports and exact skill source snapshots for every version tested. Trial events record task/seed, attempt, baseline/candidate reward verdict, failure class, source fingerprints, report hash, provider charge and scoped cleanup. A new candidate runtime fingerprint creates a change event with changed-file hashes and a required `--change-note` explaining the edit. Do not put secrets in that note. The hash chain detects accidental or unsanctioned edits when the runner resumes, but these local files are not tamper-proof. Reports may include synthetic page text and should stay private; the OpenRouter key is not recorded.

## Improvement loop and limits

The initial sweep does not rerun failures. Review a failed report and distinguish harness/infrastructure problems, unsupported widgets, missing exact values, and actual incorrect actions. If a narrow skill or benchmark-adapter change is justified, edit it, run `npm test` and relevant local component checks, then resume with `--retry case/seed,case/seed --change-note "Reason for the change"`. Only the named tasks can retry under that change; unrelated failures are not blindly rerun. A failed task can run once initially plus at most three retries. A retry is offered only after runtime or benchmark-adapter source files change; a documentation-only edit does not unlock one. Record a currently unsupported case without spending retries using `--defer case/seed --reason "Observed inaccessible slider"`. Do not treat a defer as a pass.

Repeat the failing seed to diagnose the fix, then use an unused seed or task as a held-out check before claiming a general improvement. Preserve existing failure reports. Do not silently delete failures, reuse the same seed as evidence of generalization, or commit/publish skill changes without the user's separate request.

For a local component regression, write its report inside the private campaign directory, then use `--record-validation /absolute/path/to/report.json --reason "what it checked"`. The campaign verifies a measured component report, records its hash, pass count and charge in the event chain, and counts that charge toward the same spend cap. Recording is read-only with respect to the report; do not record a report twice.

The campaign stops before starting a pair if its configured duration has elapsed, if any trial's model charge is unmeasured, or when accumulated charges reach the configured cap less a 5% reserve (up to $0.50). A single already-running pair may still incur additional provider charges before its result is known; use a provider-side account cap for an absolute billing guarantee. The runner forwards its deadline signal to the Docker study for scoped cleanup. If Docker cleanup fails or the study is incomplete, the campaign stops for inspection. The dashboard and campaign can be restarted from their audit files. The dashboard service deliberately remains running across terminal exits; stop it explicitly with `npm run gym:dashboard:service -- stop --campaign-root /absolute/path/to/skill/.runs` when it is no longer wanted.

If an incomplete Docker trial has unknown model charges, inspect its report and cleanup first. Once the container is gone, `--reconcile-run RUN_ID --reason "why the trial failed"` reads the configured key's cumulative usage from OpenRouter and reserves that entire amount against the campaign budget. The audit retains the failed trial and the reconciliation event; the dashboard distinguishes measured charges from this conservative reserve. This does not convert the failed trial into a pass or restore its retry slot. Only then may an explicitly targeted infrastructure retry run. If the key-usage check fails or cleanup is uncertain, leave the campaign stopped.
