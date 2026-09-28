---
name: benchmark-improvement-loop
description: Design and run auditable test–verify–improve campaigns for agent skills when introducing a benchmark, diagnosing benchmark failures, or evaluating whether a skill change generalizes. Keep practice retries separate from held-out evidence.
metadata:
  version: "1.0.0"
---

# Benchmark Improvement Loop

Use this skill for a new benchmark adapter or an extended improvement campaign. The goal is to learn from independently verified failures without turning a practiced score into a claim of general reliability. Ordinary unit-test additions do not need a campaign.

## Establish the experiment

1. Inspect the target skill, repository policy, existing tests, current worktree and prior reports. Preserve user changes. Determine whether the request authorizes design only, implementation, paid execution, or unattended execution; do not infer a spend or duration allowance. A new campaign needs explicit time and spend limits before paid or unattended runs.
2. Check the benchmark's current official setup, license, evaluator, task state/reset behavior, credentials, and resource needs. Prefer an independently authored task set and an outcome verifier separate from the agent's completion claim. Label self-authored fixtures and LLM-judged results separately. Do not call a task independent merely because it has a different seed if its family, answers, or adapter rules were used during development.
3. Freeze a baseline skill snapshot, agent/model configuration, browser and benchmark versions, evaluator, image digests, task selection rules, action limits, and score definition. Predeclare a development set and an untouched holdout, ideally with different task families as well as seeds. Record exclusions before seeing outcomes. A public or previously inspected task is not a clean holdout.

## Build the smallest contained adapter

Keep the benchmark's sites, browser, evaluator and auxiliary services in scoped containers where practical. Do not install host databases, display servers or benchmark services by default. Pin dependencies, check platform and disk needs, use named resources, bind any viewer or dashboard to localhost, and define exact cleanup before the first run. A headed viewer is observational only during scored trials.

The adapter may convey only the task's legitimate goal, starting page and caller-supplied values. It must not leak hidden answers, reward state, task IDs as action hints, or evaluator internals to the agent. Verify with a no-model smoke test that the agent and evaluator operate on the same state and that reset produces a clean next task. Keep any fallback model, human takeover, or LLM judge outside the primary score unless the experiment explicitly studies it.

Reuse an existing campaign runner when it meets these conditions; otherwise implement the minimal equivalent. Read [campaign evidence contract](references/campaign-evidence.md) when building or operating a runner, audit, dashboard, or unattended campaign. For this repository's BrowserGym MiniWoB and original integration lanes, the existing [campaign runbook](../agent-browser-jev/references/browsergym-campaign.md) is an implementation example, not a universal task list.

## Run, diagnose, improve

- Run the frozen first-attempt matrix before changing the candidate. Pair baseline and candidate on identical task states when feasible and alternate order. Record each trial immediately with authoritative reward or state checks, actions, failure class, elapsed time, model charges and cleanup result. A model's `reported_complete`, correct refusal or safe handoff is not a task pass unless the external verifier says so.
- Separate infrastructure/evaluator failure, unsupported control, missing authorized input, unsafe action and genuine agent error. Preserve every failed and interrupted report. Stop on uncertain cleanup or unmeasured paid calls until they are inspected and conservatively accounted for.
- For a justified fix, identify the first divergent observation/action, make the narrowest general change, add a local regression, and record source hashes plus a reason. Retry only named task/seed pairs after a relevant change, within the user's retry allowance; propose at most three retries after the initial attempt when no cap is given, and confirm the cap before unattended retrying. Never silently resample a failure, turn a defer into a pass, or use an unrelated edit to unlock a retry.
- Check the failing task, nearby component regressions and the older suite. Then freeze the candidate again and score the untouched holdout once. If holdout feedback drives another change, that set becomes development data; reserve a new holdout before making another generalization claim. Compare first attempts, repaired attempts, holdout results and regressions separately.

## Report and finish

Report task and seed counts, baseline/candidate first-attempt scores, targeted retries, held-out results, verifier type, fixes, regressions, time and measured/reserved spend. State where evidence supports only benchmark-specific tuning. Do not infer statistical reliability from a small or curated set. Keep private traces and credentials out of published summaries. Remove only campaign-owned containers, images, volumes, networks and temporary viewers when no other run needs them; preserve audit reports and source snapshots. Follow the target repository's versioning, changelog, validation and release rules. Do not commit, publish or schedule ongoing work without authorization.
