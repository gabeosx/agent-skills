# 🧪 Benchmark Improvement Loop

Plan and run an auditable improvement campaign for an agent skill. The workflow separates first attempts, development retries, and reserved confirmation cases so that practiced-task results do not become claims about general reliability.

## Install

```bash
npx skills add gabeosx/agent-skills --skill benchmark-improvement-loop
```

Choose your agent when prompted. See the [repository installation guide](../../README.md#install-a-skill) for CLI requirements and installation scope.

## Use it

Provide the skill you want to improve, the benchmark or representative tasks, the outcome that matters, and any execution or spending limits. The agent uses the target skill alongside this workflow.

For example:

> Compare this candidate skill with the current version on matched tasks. Reserve confirmation cases before opening results, independently verify outcomes, and retain every first attempt and retry.

> Investigate this benchmark failure, make a general fix, and test whether the fix transfers to the reserved cases. Report assistance, wrong effects, and unknown costs separately.

The workflow covers the experiment contract, runner qualification, matched trials, independent outcome checks, diagnosis, repairs, and reporting. It does not bundle a benchmark runner or supply credentials, infrastructure, model access, or permission for paid or unattended work.

## What you need

For a campaign, you need task inputs, an execution environment, a way to restore comparable starting states, and an outcome check independent of the actor's completion claim. The tools and services depend on the target benchmark. Planning a campaign does not require starting those services.

Before scored trials, the agent freezes the comparison and qualifies the runner and evaluator. Failed isolation stops the affected lane; incomplete or invalid trials remain in the record. A retry needs a stated purpose rather than silently replacing an unfavorable first result.

## Results to expect

The report distinguishes development from confirmation and includes denominators, paired changes, failures, wrong or extra effects, caller assistance, measured costs, unknown measurements, and untested areas. If confirmation informs another change, those cases become development material and fresh confirmation is needed.

Read the [agent instructions](SKILL.md) and [campaign evidence contract](references/campaign-evidence.md) for details. The repository's archived browser studies provide examples of the workflow and its failure analysis; their historical results do not establish reliability for a new campaign.
