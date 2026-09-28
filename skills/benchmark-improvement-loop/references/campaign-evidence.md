# Campaign evidence contract

Use this when a benchmark campaign needs a runner, persistent audit, dashboard, or unattended operation. Adapt the storage format to the project; the fields and separation of evidence matter more than a particular implementation.

## Frozen manifest

Record the target skill and baseline source fingerprints; candidate starting fingerprint; benchmark, evaluator, browser, model and container versions/digests; task IDs, seeds, variants and predeclared exclusions; development versus holdout membership; action and wall-clock limits; authorized cost ceiling, reserve and retry ceiling; start/deadline; and the exact resources the campaign may create or remove. Do not include API keys, viewer passwords or raw credentials.

For an agent-browser benchmark, record whether the primary arm is Jev-only and whether any caller recovery, fallback model or human action occurred. Such interventions must be scored in a separate arm or marked contaminated, never quietly counted as an autonomous pass.

## Adapter acceptance gates

Before a paid matrix, prove that a task can start and reset on the pinned container image, the agent's browser sees the same page the benchmark scores, and a fresh task is not contaminated by prior state. Check the evaluator with a deliberate non-completion; an agent's completion message alone must not pass. When feasible, use a simple scripted positive control to distinguish a broken evaluator from an incapable agent. Confirm that goals and legitimate supplied values cross the adapter, while hidden answers, reward state and evaluator metadata do not. Record image identity, exact scoped resource names and cleanup evidence from the smoke run.

If a suite requires separately hosted sites, start only the selected sites with scoped containers and verify their reset paths. If a task requires a text-answer contract, extra credentials, an LLM judge or unsupported browser powers, either build and label that separate experimental arm or defer it; do not silently score it as the existing browser-control skill.

## Append-only trial and change records

For each trial, write a durable result before starting the next one: task/seed/variant, attempt number, development or holdout label, baseline/candidate source hashes, container/evaluator identity, authoritative reward or named state conditions, agent return reason, failure class, report hash/path, start/end times, measured model charge, and scoped cleanup result. Keep raw traces private. An incomplete trial remains visible and consumes its attempt unless a documented infrastructure policy says otherwise.

For each change, record the diagnostic evidence, changed source hashes, rationale, tests, and exact task/seed pairs authorized for retry. Validation runs that call a model belong in the same spend ledger. A hash chain can detect accidental editing of local events but is not tamper-proof; do not describe it as immutable security storage.

If a run is interrupted with unknown charges, stop scheduling paid work. Confirm the scoped resources are stopped, inspect partial reports, and reserve a conservative upper bound or reconcile authenticated provider usage before resuming. A preflight budget guard cannot guarantee an absolute ceiling for calls already in flight; use a provider-side cap when that guarantee matters.

## Scoreboard and interpretation

Show at least these separate views:

| View | Meaning |
| --- | --- |
| Frozen first attempt | Candidate and baseline before feedback from this campaign; denominator includes failures and safe handoffs. |
| Repaired development set | Latest outcomes after documented, targeted retries; never replace the first-attempt row. |
| Untouched holdout | One scored attempt per predeclared task/seed after candidate freeze; show baseline comparison when available. |
| Operational state | Pending, running, passed, failed, deferred and infrastructure-stopped counts, plus deadline, measured/reserved spend and cleanup. |

An exact-seed replay establishes that a fix addresses that instance. A new seed of the same task family is a limited transfer check. A different, externally authored task family is stronger evidence. A self-authored integration suite checks regression and workflow fit, but it is not a public benchmark score. Report paired wins and regressions as well as totals; do not collapse these levels into one headline percentage.

For an unattended run, provide a read-only status command and, when the user wants live monitoring, a temporary dashboard on `127.0.0.1`. It serves summaries rather than secrets or raw page traces and closes with the campaign or its deadline. It is a view over the audit, not a second mutable source of truth. Deactivate any campaign-specific scheduled follow-up at completion or a terminal limit.
