---
name: benchmark-improvement-loop
description: Integrate a benchmark or run an auditable improvement campaign for an agent skill, separating development retries from frozen confirmation.
metadata:
  version: "1.1.0"
---

# Benchmark Improvement Loop

Improve independently verified outcomes without presenting practiced tasks as generalization. Use this for benchmark adapters, failure-driven campaigns and transfer evaluations; ordinary unit-test edits do not require a campaign.

## Define the experiment

Use the target skill, repository policy and existing evidence to establish the current baseline and requested outcome. Apply the user's existing authorization for paid execution, unattended work and infrastructure. Record any limits actually imposed, including an explicit no-cap authorization; do not invent a mandatory ceiling or request approval again for covered iterations. A credential or past campaign alone does not authorize new paid work. Keep operational per-trial limits separate from campaign permission.

Before opening new evaluation outcomes, freeze source/model/harness versions, task selection and exclusions, development and confirmation membership, comparable execution limits, and meaningful acceptance criteria. Cover multiple families and sites where feasible. Prefer independent tasks and an outcome verifier separate from the agent's completion claim. Previously inspected tasks and same-family seeds are not untouched-family evidence. Predeclare expected negatives and forced-recovery fixtures separately from positive tasks.

Measure verified autonomous completion, false completion, wrong effects and caller dependence alongside official scores, cost and latency. For delegated agents, extra caller reasoning or gestures cannot count as standalone improvement. A small favorable sample alone does not establish reliability.

## Qualify and run

Read the [campaign evidence contract](references/campaign-evidence.md) when building or operating a runner, audit or unattended campaign. It specifies qualification, durable records, isolation and score definitions. Reuse an existing qualified runner when suitable; the [BrowserGym campaign runbook](../agent-browser-jev/references/browsergym-campaign.md) is a repository example, not a universal task list.

- Verify the benchmark's official setup, license, dependencies, evaluator and state/reset contract. Prefer scoped containers for sites and services, pin versions, bind viewers to localhost and identify owned resources for cleanup. A headed viewer is observational during scored trials.
- Keep hidden answers, task-ID action hints, evaluator routes and reward internals out of runtime and actor input. Convey only legitimate goals, starting pages and supplied values.
- Qualify actor/evaluator state agreement and persisted-state restoration with no-model controls on the actual runner path before scoring. Clean browsers or successful reset responses alone are insufficient. Authored positive controls must also prove rendered target reachability across claimed pages.
- Run frozen baseline and candidate on equivalent clean states, pairing and alternating order where feasible. Persist every started trial, result, action trace and charge before independent readbacks. Preserve failures, interruptions and exclusions.
- Independently audit the requested target, complete scope and wrong/extra effects, including shared configuration. Retain official reward unchanged; full reward can coexist with a scope failure, and an incomplete return can follow a verified goal.

Stop the affected lane on failed isolation or evaluator qualification, preserve raw evidence and charges, and append an invalidation scoped to the affected comparisons. Requalify the repaired harness before scoring again. A missing counterpart makes a pair incomplete; it does not invalidate other clean pairs. Resolve unsafe cleanup or unknown paid-dispatch accounting before further dependent runs; conservative reservations may support continuation as described in the evidence contract.

## Diagnose and improve

Investigate the first divergent observation or action. Distinguish infrastructure defects, missing authorization/input, unsupported operations and agent errors. Make a general change justified by evidence; a broader controller or observation redesign is appropriate when narrow patches do not address the cause. Add a meaningful regression and retain failed candidates and source fingerprints.

Retries must have an explicit experimental purpose: testing a relevant change, recovering under a predeclared infrastructure policy, or measuring repeated-run variability. Record every attempt and preserve the first-attempt score. Respect user-imposed limits; with sustained uncapped authorization, choose justified follow-up experiments without an arbitrary retry cap or another approval pause. Never silently resample failures or treat unchanged retries as new transfer evidence.

Run affected regressions, then freeze the candidate and evaluate the reserved confirmation set without feedback-driven edits. If confirmation outcomes inform a change, that set becomes development data; reserve fresh confirmation before making a new generalization claim. Continue justified improvement paths when acceptance is not met rather than reducing the standard after seeing results.

## Maintain instructions and report

Update the target skill's operating instructions when behavior changes or evaluation establishes a limitation. Keep essential delegation boundaries and recovery routing in `SKILL.md`, conditional mechanics in references, and experimental claims tied to their source snapshots. Distinguish an unavailable operation from an inconsistent decision or independently reproduced application defect. Guidance and implementation must agree before candidate acceptance.

Report the frozen baseline comparison, development retries and confirmation results separately, with denominators, paired wins/regressions, family/site coverage, verifier methods, assistance, wrong effects, false completions, time and measured/reserved spend. Use the [score definitions](references/campaign-evidence.md#scoreboard-and-interpretation); unknown caller cost or effort remains unknown. State limitations and whether evidence supports only instance repair or broader transfer. A safe stop is not itself a completed task.

Keep private traces and credentials out of public summaries. Remove only campaign-owned resources no active run needs, retaining audit evidence and snapshots. Follow repository release bookkeeping and validation. Commit, publish or schedule future work only within user authorization.
