# 🔄 GitHub Scrum Flow

Coordinate GitHub issues, Conductor tracks in `plan.md`, and branches through a PR-first workflow. The skill helps an agent keep the stakeholder request, implementation plan, and code change connected as work progresses.

## Install

```bash
npx skills add gabeosx/agent-skills --skill github-scrum-flow
```

Choose your agent when prompted. See the [repository installation guide](../../README.md#install-a-skill) for CLI requirements and installation scope.

## Requirements

For repository work, the agent needs a Git checkout and the GitHub CLI with access to the intended repository. Supply the relevant `plan.md` track and issue links when they already exist. Installing the skill does not configure GitHub authentication or grant permission to change a repository.

## Use it

For example:

> Start the implementation track in plan.md, connect it to the existing GitHub issue, and open a short-lived branch. Keep the change scoped to the track and submit a PR with validation evidence.

> Review our active tracks against their issues and branches. Identify missing links and stale status, then propose the updates before applying them.

The skill maps each unit of work to its issue, plan item, and branch. During implementation, it keeps commits focused and records consequential decisions or blockers. When authorized, it can post issue updates, push branches, and create pull requests through `gh`.

## Completion and boundaries

The prescribed workflow uses branches and pull requests for significant changes and prohibits local merges to `main`. Work that drifts into a different task is split or logged rather than hidden in the current change.

At handoff, expect a PR linked to the task, a summary of the change, and the relevant validation results. The instructions specifically require tests, `pnpm lint`, and `pnpm type-check` to pass. Projects using another toolchain need to reconcile that pnpm-specific requirement with their own checks. The skill does not supply a test suite or establish that a PR is approved to merge.

Read [the agent instructions and CLI reference](SKILL.md) for the full procedure and naming conventions.
