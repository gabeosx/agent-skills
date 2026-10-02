# Campaign evidence contract

Use this when a benchmark campaign needs a runner, persistent audit, dashboard, or unattended operation. Adapt the storage format to the project; the fields and separation of evidence matter more than a particular implementation.

## Frozen manifest

Record the target skill and baseline source fingerprints; candidate starting fingerprint; benchmark, evaluator, browser, model and container versions/digests; task IDs, seeds, variants and predeclared exclusions; development versus holdout membership; action and wall-clock limits; authorization scope and any cost, duration or retry limits (or explicit uncapped authorization), accounting reserves, start time and any deadline; and the exact resources the campaign may create or remove. Do not include API keys, viewer passwords or raw credentials.

For an agent-browser benchmark, record whether the primary arm is Jev-only and whether any caller recovery, fallback model or human action occurred. Such interventions must be scored in a separate arm or marked contaminated, never quietly counted as an autonomous pass.

When testing planning assistance, preserve the original goal and initial helper return. A planner that supplies only reasoning still contributes assistance even if the helper executes every gesture. Compare against an unassisted continuation with the same total execution budget when feasible, so extra attempts are not mistaken for a planning benefit. Record the planner model, calls, tokens, elapsed time and charges separately; include those charges in campaign accounting and any applicable ceiling. Apply the unknown-charge reconciliation rule below to assisted calls as well.

Predeclare positive tasks, expected negative cases, and intentionally forced recovery fixtures. Record which state must reset, the restore mechanism and clean-start checks, whether candidate/baseline share a backend, and which actor performs each action. Separate the official reward criterion from completion reporting, action-scope checks and caller-effort metrics. Supplied initial goals/values and harness setup are not caller rescue; post-delegation input, reasoning or gestures that advance the task are assistance and must be recorded. Routine final acceptance is distinct from recovery.

## Adapter acceptance gates

Before a paid matrix, prove that a task can start and reset on the pinned container image, the agent's browser sees the same page the benchmark scores, and a fresh task is not contaminated by prior state. Check the evaluator with a deliberate non-completion; an agent's completion message alone must not pass. When feasible, use a simple scripted positive control to distinguish a broken evaluator from an incapable agent. Confirm that goals and legitimate supplied values cross the adapter, while hidden answers, reward state and evaluator metadata do not. Record image identity, exact scoped resource names and cleanup evidence from the smoke run.

If a suite requires separately hosted sites, start only the selected sites with scoped containers and verify their reset paths. If a task requires a text-answer contract, extra credentials, an LLM judge or unsupported browser powers, either build and label that separate experimental arm or defer it; do not silently score it as the existing browser-control skill.

For a site with persisted state, qualify the exact runner reset path before paid scoring:

1. Record a known initial state through a readback independent of the reset response. Include the task-relevant persisted records, ownership and existing values; a fresh browser or empty local storage is insufficient for backend state.
2. Make a reversible synthetic mutation in the isolated benchmark environment and verify that it persisted. Exercise the storage affected by the selected tasks, not an unrelated cache or UI flag. Use only campaign-owned state.
3. Run the proposed reset or replace the site with a verified clean instance. Read back that the mutation is absent and required original state is restored, including pre-existing values. Record the image, backend identity, restore source, readback conditions and result without exposing secrets.
4. Repeat through the runner's actual arm transition. Prove that mutations from one arm and from a positive evaluator control cannot survive into the next arm or task. Verify restoration in each run order the experiment uses; alternating order alone does not provide isolation.
5. Attach clean-start evidence to every scored arm. Stop before model calls if it is missing or fails. Exercise this failure path with a deliberately dirty state in a no-model check. Readiness is separate for evaluator correctness, reset isolation and actor/action attribution; passing one gate cannot substitute for another.

An endpoint called `init` or `reset` may only configure the application, restart services or clear cache. Check its semantics in the pinned implementation and verify the observed effect. Use database restoration or a fresh scoped backend when required. Keep these evaluator-side probes out of agent inputs. If the existing runner cannot enforce clean starts, it is not qualified for unattended scored work until that gap is fixed; a documentation checklist alone is not enforcement.

Outcome verification also needs to detect relevant wrong or extra effects. A benchmark may award full reward for changing the requested record while ignoring an unrelated mutation. Inspect the action trace and independently check the requested target, containment and allowed effects. Record scope as passed, failed or unassessed; unassessed scope is not evidence of correct effects. Bind later supplemental reviews to the exact report hash and actor/arm, name the review method, and append their verdicts without rewriting raw reward or traces. Missing review stays unassessed; a later scope review cannot rehabilitate invalid isolation. Keep supplemental scope checks labeled and separate from the unchanged official evaluator; do not alter reward to make a controller look better or call a goal-state pass with a scope violation a fully correct task.

Include shared metadata when actors can add fields, options, groups, templates, or attribute sets. Such controls can persist a global change before a record save. A product or document row projection alone cannot assess that scope. If this gap is discovered afterward, preserve the affected attempt, bind supplemental request/source/readback evidence to it, and leave any unverified effects unassessed. A fresh-container replacement can still establish isolation while the original scope projection was incomplete; distinguish those guarantees.

## Append-only trial and change records

An authored fixture's positive control must establish reachability as well as verifier correctness. Enumerate the rendered records across its actual navigation, check that expected targets are exposed, and reject contradictory page counts or premature end markers. A direct state mutation can test the outcome checker while concealing an impossible browser task. If this defect appears after scoring, invalidate only the affected comparisons, retain charges and attempts, and qualify the corrected fixture before a diagnostic rerun.

Record that an arm has started before dispatching paid work. Persist its returned result, charge and available trace before requesting a separate browser snapshot or verifier readback. If that later check fails, retain the paid result as an incomplete arm with an unknown outcome; do not lose its charge or infer success. Recovery of the harness is separate from repeating the task.

For each trial, write a durable result before starting the next one: task/seed/variant, attempt number, development or holdout label, baseline/candidate source hashes, container/evaluator identity, authoritative reward or named state conditions, agent return reason, failure class, report hash/path, start/end times, measured model charge, and scoped cleanup result. Keep raw traces private. An incomplete trial remains visible and consumes its attempt unless a documented infrastructure policy says otherwise.

Also retain reset/readback evidence and backend identity, positive/negative/recovery category, goal-state verification, completion report, action-scope verdict, and each actor's interventions. For assisted episodes, record intervention type/count, whether assistance was scripted, human or another model, remaining work and final outcome. Preserve the initial helper return separately from later caller verification or recovery. Record caller tokens, elapsed time and cost when measured; missing measurements are unknown, not zero. A generic `handoff` return does not by itself prove an unsupported control.

For each change, record the diagnostic evidence, changed source hashes, rationale, tests, and exact task/seed pairs selected for retry within the existing authorization. A predeclared repeated-run study may also repeat an unchanged snapshot to measure variability; preserve every attempt and do not promote its best run as a first-attempt result. Validation runs that call a model belong in the same spend ledger. A hash chain can detect accidental editing of local events but is not tamper-proof; do not describe it as immutable security storage.

If a run is interrupted with unknown charges, stop scheduling paid work. Confirm the scoped resources are stopped, inspect partial reports, and reserve a conservative upper bound or reconcile authenticated provider usage before resuming. A preflight budget guard cannot guarantee an absolute ceiling for calls already in flight; use a provider-side cap when that guarantee matters.

When an isolation or evaluator defect invalidates evidence, append a record linking the affected report hashes, defect, scope and supporting observations. If the scope is uncertain, mark potentially affected comparisons invalid pending audit. Preserve raw rewards, costs and attempts; invalidate their comparative interpretation rather than editing history or converting infrastructure defects into agent failure rates. Derived summaries and dashboards must show the invalid status wherever those scores appear. A repaired rerun is a new frozen comparison with its own source and harness fingerprints. Previously inspected tasks remain development data, and an invalid run does not replenish the budget or retry allowance.

## Scoreboard and interpretation

Show at least these separate views:

| View | Meaning |
| --- | --- |
| Frozen first attempt | Candidate and baseline before feedback from this campaign; denominator includes failures and safe handoffs. |
| Repaired development set | Latest outcomes after documented, targeted retries; never replace the first-attempt row. |
| Untouched holdout | One scored attempt per predeclared task/seed after candidate freeze; show baseline comparison when available. |
| Current candidate coverage | Outcomes for one exact candidate/harness fingerprint; show missing tasks as untested rather than borrowing older successes. |
| Delegation and caller work | Verified autonomous goals, completion reports, return-control reasons and actual assistance, by family and snapshot. |
| Invalid comparisons | Affected counts, raw outcomes, defect and evidence; excluded from performance claims without disappearing from history or spend. |
| Operational state | Pending, running, passed, failed, deferred and infrastructure-stopped counts, plus deadline, measured/reserved spend and cleanup. |

An exact-seed replay establishes that a fix addresses that instance. A new seed of the same task family is a limited transfer check. A different, externally authored task family is stronger evidence. A self-authored integration suite checks regression and workflow fit, but it is not a public benchmark score. Report paired wins and regressions as well as totals; do not collapse these levels into one headline percentage.

For every valid frozen delegation sample, show these counts alongside official reward:

| Metric | Definition |
| --- | --- |
| Verified autonomous goal | Goal reached without post-delegation caller assistance, independently verified; may still have a non-complete helper return. |
| Verified reported completion | Subset of autonomous goals that also returned `reported_complete`. |
| Return-control rate | Positive tasks with a non-complete return divided by all started positive tasks; break out reason and whether the goal was already reached. Keep missing results visible as unknown, never inferred complete. |
| Caller-assisted completion | Tasks verified complete only with caller input, intervention or recovery, separated by actor; never added to the autonomous numerator. |
| Expected boundary behavior | Predeclared negative cases that stopped correctly, shown with their own denominator. Forced recovery fixtures are also separate from natural takeover frequency. |
| Scope violation / false completion | Wrong or extra actions, and completion claims without verified success; retain both even if another metric looks favorable. |

Keep failed and interrupted starts in the positive-task denominator; show planned-but-unstarted work separately. When return reasons are missing, label the observed return-control fraction a lower bound and show the unknown count. Invalid comparisons cannot supply takeover rates. Do not use the share of easy gestures performed by the delegated agent to hide a task that required one difficult caller action. A return after independently verified success may require only caller acceptance, not more browser work, but it remains a non-complete helper return. Scripted recovery validates an interface, not the effectiveness or cost of a caller LLM.

Compare autonomy and caller effort as well as reward between matched snapshots. More handoffs on previously completed supported tasks are autonomy regressions even when they reduce unsafe actions; expose the tradeoff rather than counting every safe stop as progress. This does not authorize forcing continued action or suppressing uncertainty. Keep a maintained capability summary linking control-family coverage to source versions, known failures, explicit exclusions and unmeasured areas. State whether these metrics are calculated by the runner, derived in an audit or still unavailable.

For an unattended run, provide a read-only status command and, when the user wants live monitoring, a temporary dashboard on `127.0.0.1`. It serves summaries rather than secrets or raw page traces and closes with the campaign or any applicable deadline. It is a view over the audit, not a second mutable source of truth. Deactivate any campaign-specific scheduled follow-up at completion or a terminal limit.

## Correct effect with a partial official reward

An unchanged official evaluator can reject a valid-looking effect because it checks an allowed request route as well as the persisted record. Keep the official reward unchanged. Record the exact requested state, action scope and completion report separately, and distinguish a confirmed rejection cause from an inference based on the evaluator's contract. Never feed expected routes or hidden target IDs into the helper to improve that score. Retain uncertainty for genuinely ambiguous user wording, such as choosing an appropriate community, rather than declaring success or failure solely from the benchmark's preferred destination.


### Incomplete comparisons

A missing counterpart or unfinished cleanup record excludes that comparison from paired scoring. It does not by itself invalidate separately completed, restoration-verified pairs. Report incomplete and state-invalid comparisons separately, preserve the partial arm, and reconcile unknown charges or conservatively reserve them under the interrupted-run rule before dispatching more paid work. A new internal campaign directory never resets a failed case's attempt history, task provenance, cumulative spending or applicable authorization limits. An explicit user change to those limits supersedes earlier limits without erasing history.
