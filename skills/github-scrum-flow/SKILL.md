---
name: github-scrum-flow
description: Unified expert for Project Management (Scrum/Agile) and GitHub Flow enforcement. Use this skill for track orchestration, backlog hygiene, GitHub Issue synchronization, branch management, and enforcing git best practices.
---

# GitHub Scrum Flow

## Overview
This skill consolidates the responsibilities of a **Scrum Master** and **Release Manager**. It is the single source of truth for:
1.  **Project Orchestration**: Synchronizing `plan.md` tracks with GitHub Issues.
2.  **Git Hygiene**: Enforcing strict branching, commit, and merging standards.
3.  **Status Reporting**: Managing the lifecycle of tasks via the `gh` CLI.

## Core Mandates

### 1. The "Golden Thread" (Issue <-> Track <-> Branch)
Every unit of work must trace back to a source of truth:
-   **GitHub Issue**: The stakeholder view (What & Why).
-   **Conductor Track (`plan.md`)**: The engineering view (How).
-   **Git Branch**: The implementation workspace.

**Rule**: You generally do not start coding without a Branch, and you do not start a Branch without a plan item (and ideally a linked Issue).

### 2. GitHub Flow Enforcement
-   **No Direct Commits or Merges to Main**: `main` is sacred and deployable. **The agent MUST NOT merge branches to `main` locally.** All code must go through a Pull Request.
-   **PR-First Workflow**: Every track or significant change requires a Pull Request created via `gh pr create`.
-   **Short-Lived Branches**: Branches should live for hours or days, not weeks.
-   **Atomic Commits**: One logical change per commit.
-   **Strict Naming**: Branches and commits must follow conventions.

### 3. Professional Visibility
-   Updates to GitHub Issues must be concise, professional, and frequent enough to show heartbeat, but not noisy.
-   Use `gh` CLI for all issue interactions to ensure audit trails.

## Procedures

### Phase 1: Initialization (Start of Task/Track)

**Trigger**: When starting a new track or task from `plan.md`.

1.  **Sync with GitHub Issue**:
    -   If a track corresponds to a GitHub Issue, post the plan summary.
    -   `gh issue comment <issue_id> --body "Starting work on Track <track_id>. Plan summary: ..."`
2.  **Establish Context**:
    -   Ensure your local `main` is up to date: `git checkout main && git pull origin main`
3.  **Create Branch**:
    -   Name format: `<type>/<short-description>-<issue_id>`
    -   **Types**:
        -   `feat`: New features
        -   `fix`: Bug fixes
        -   `chore`: Maintenance/Config
        -   `refactor`: Code restructuring
        -   `docs`: Documentation
        -   `test`: Adding tests
    -   **Example**: `git checkout -b feat/inventory-ledger-123`

### Phase 2: Implementation (The Loop)

**Trigger**: During active coding.

1.  **Scope Management**:
    -   If work drifts outside the branch name's scope (e.g., fixing a UI bug while in `feat/api-auth`), **STOP**.
    -   Stash changes, switch to main, create a new `fix/...` branch, or log it as a new task.
2.  **Status Updates**:
    -   Post to GitHub Issue on: **Blockers**, **Major Architectural Decisions**, or **Phase Completion**.
    -   `gh issue comment <issue_id> --body "Update: [Topic]. Summary: ..."`
3.  **Commit Protocol**:
    -   Stage only relevant files.
    -   Format: `type(scope): description` (e.g., `feat(auth): implement jwt validation`).

### Phase 3: Verification & Closure

**Trigger**: When a task or track is marked `[x]`.

1.  **Final Verification**:
    -   Ensure all tests pass.
    -   Ensure `pnpm lint` and `pnpm type-check` pass.
2.  **Pull Request Submission**:
    -   **MANDATORY**: Push the branch and create a PR. Do NOT merge locally.
        ```bash
        git push origin <branch_name>
        gh pr create --title "Track <track_id>: <Title>" --body "Closes #<issue_id>. Verification: [Evidence]"
        ```
3.  **Issue Handover**:
    -   Inform the user that the PR is ready for review and merge.
    -   Do NOT delete the branch until the PR is merged (usually by the user or CI).

## Reference: CLI Cheatsheet

### GitHub (`gh`)
-   **List Issues**: `gh issue list`
-   **View Issue**: `gh issue view <id>`
-   **Comment**: `gh issue comment <id> --body "..."`
-   **Close**: `gh issue close <id>`
-   **Create PR**: `gh pr create --title "..." --body "..."`

### Git
-   **New Branch**: `git checkout -b <name>`
-   **Delete Branch**: `git branch -d <name>`
-   **Log (One Line)**: `git log --oneline -n 10`
-   **Status**: `git status`
