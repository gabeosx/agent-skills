# Agent Skills Repository Policy

This file is the canonical instruction source for work in this repository. The root `AGENTS.md` is only a compatibility shim.

## Instruction Priority

Apply instructions in this order:

1. Root `AGENTS.md` compatibility shim.
2. This canonical `.agents/AGENTS.md` policy.
3. The selected `skills/<skill-name>/SKILL.md` for a matching workflow.
4. A more specific nested `AGENTS.md`, if present.
5. Normal repository inspection and reasoning.

## First Moves

Before editing:

1. Inspect `git status` and preserve unrelated or pre-existing work.
2. Read `README.md`, `CHANGELOG.md`, and the affected skill's complete `SKILL.md`.
3. Inspect the affected skill's resources and current `metadata.version`.
4. Determine which skills and repository-level interfaces the requested change affects.
5. Choose the required version increment before implementation so the behavioral contract is explicit.

Do not read every skill in full. Select only the skills relevant to the task.

## Mandatory Versioning And Changelog Contract

Every change that affects a skill must update all of the following in the same working change or pull request:

1. The affected skill's files.
2. The quoted `metadata.version` in that skill's `SKILL.md` frontmatter.
3. The root `CHANGELOG.md` with a user-visible summary under a heading matching that skill's name and new version.
4. Relevant validation or tests.

Do not finish, hand off, or describe a skill change as complete if its version and changelog entry are missing. Apply the contract to changes anywhere inside `skills/<skill-name>/`, and to repository-level changes that alter that skill's triggering, behavior, distribution, validation, or documented guarantees.

Each skill is versioned independently. Increment only affected skills; do not bump unrelated skills for convenience.

Use Semantic Versioning:

- **Major:** Incompatible changes to triggering, required inputs, behavior guarantees, outputs, security expectations, or resource paths consumers may rely on.
- **Minor:** Backward-compatible capabilities, workflows, supported environments, or material guidance improvements.
- **Patch:** Backward-compatible fixes, clarifications, validation improvements, or resource corrections without a material new capability.

The release bookkeeping required by this policy does not recursively require another version increment. A version-only correction still requires an explanatory changelog entry.

## Repository-Only Changes

Every repository change must be represented in `CHANGELOG.md`, including changes limited to repository policy, automation, CI, indexes, or contribution documentation. Record these under `## Unreleased` with a `### Repository` subsection unless they are being included in a named repository release.

Do not invent a skill version bump for a repository-only change that does not alter a skill artifact or contract. If repository releases later receive their own version, document that canonical version source in `README.md` before using it.

## Changelog Rules

- Maintain one root `CHANGELOG.md`; do not add per-skill changelogs.
- Write entries for users and maintainers: describe behavioral impact, migration needs, security implications, and compatibility changes rather than listing filenames.
- Record each prepared skill version under `## <skill-name> <version> - YYYY-MM-DD`; the heading must match `metadata.version` exactly even before the commit is tagged.
- Keep repository-only work under `## Unreleased` in a `### Repository` subsection.
- Multiple edits made while preparing the same uncommitted skill release belong in the same version entry and do not require repeated increments.
- Never rewrite or delete historical release entries except to correct a factual error, and explain such corrections under `Unreleased`.

## Skill Editing Rules

- Keep `SKILL.md` focused on decisions and procedures another agent must follow.
- Use progressive references for detailed material and keep links one level deep where practical.
- Do not add a per-skill `README.md`, `CHANGELOG.md`, or process journal.
- Preserve compatibility by default. Do not silently remove supported workflows or perform a major migration.
- Use official current sources for time-sensitive facts, and record important compatibility assumptions in the skill or its references.
- Do not add product-specific `agents/openai.yaml` unless the repository adopts that convention explicitly.

## Definition Of Done

Before reporting completion:

1. Run the skill-creator structural validator for every changed skill.
2. Validate changed links and resource paths.
3. Run relevant skill-specific fixtures, tests, or forward-evaluations in proportion to risk.
4. Run `python3 .agents/scripts/validate_release_contract.py` and resolve every failure. In CI or when validating committed work, pass the appropriate comparison ref with `--base-ref`.
5. Confirm every changed skill has exactly one intentional SemVer increment and a matching versioned changelog heading.
6. Confirm every repository-only change is represented under `Unreleased`.
7. Run `git diff --check` and inspect the final diff for unrelated changes.
8. Clean up temporary files and only the containers, images, networks, or volumes created by validation. Never use destructive global cleanup as a test teardown shortcut.
9. Report validation performed, anything not exercised, cleanup evidence, and the final version changes.

## Commits, Tags, And Releases

- Do not commit, push, publish, or create a release unless the user requests it.
- Never tag an uncommitted working tree.
- Tag a committed skill release as `<skill-name>/v<version>`, for example `devcontainer-helper/v1.1.0`.
- Create a GitHub Release only from the matching committed changelog entry.
