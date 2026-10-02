# Agent Skills Repository Policy

This is the canonical repository policy; root `AGENTS.md` is a compatibility shim. Follow applicable user instructions, then this policy and the affected skill's `SKILL.md`. Nested instructions may specialize a workflow without overriding this policy's release or integrity requirements.

## Scope and authorization

Inspect `git status` before editing and preserve pre-existing work. Read the affected skill's entrypoint and the resources needed for the change. Use `README.md` for repository interfaces and distribution, and the relevant `CHANGELOG.md` entries for release history; a small edit does not require reading every document.

Requests to implement or fix authorize in-scope local edits, disposable local validation, and repairs required to finish that work. Continue through the requested outcome without repeated approval pauses. Paid experiments, external services and unattended execution require authorization that covers them; use authorization already given in the session. An explicitly uncapped campaign does not need an invented spend, duration or retry ceiling. Historical campaign limits remain historical when the user supersedes them. Ask only when missing facts or additional authority materially block the next action.

For a new benchmark adapter or benchmark-driven improvement campaign, use [Benchmark Improvement Loop](../skills/benchmark-improvement-loop/SKILL.md) alongside the affected skill. Keep development, retry and confirmation evidence distinct, independently verify effects, and preserve failed attempts. The skill provides the experiment contract; it does not grant new permissions.

## Versioning and changelog

Each skill is versioned independently. A skill change includes its files, quoted `metadata.version` in `SKILL.md`, a matching root `CHANGELOG.md` heading, and relevant validation in the same working change. This includes repository-level changes that alter that skill's triggering, behavior, distribution, validation or guarantees. Do not mark a skill change complete while this bookkeeping is missing.

Choose the increment from the resulting contract:

- **Major:** incompatible triggering, required inputs, guarantees, outputs, security expectations or resource paths.
- **Minor:** backward-compatible capabilities, workflows, environments or material guidance improvements.
- **Patch:** backward-compatible fixes, clarifications or validation/resource corrections.

Keep one intentional increment per prepared release. Additional edits to the same uncommitted release share its version; bookkeeping does not recursively require another bump. A version-only correction needs an explanatory changelog entry. Do not bump unrelated skills.

Maintain one root `CHANGELOG.md`. Use `## <skill-name> <version> - YYYY-MM-DD` matching `metadata.version`, including prepared releases. Describe user-visible impact, compatibility and limitations. Record repository-only changes under `## Unreleased` / `### Repository` without inventing a skill bump. Preserve historical entries; document factual corrections under `Unreleased`. If repository releases gain their own version, document its canonical source in `README.md` before using it.

For an explicitly requested retirement, remove the affected public `SKILL.md` rather than hiding an installable entrypoint. Preserve historical instructions under a different filename with an archive notice before any historical frontmatter. Record the skill name, `status: archived`, retirement date, major archive-contract `metadata.version`, historical instructions, research report and evidence register in `ARCHIVE.json` at its existing directory. That manifest replaces the removed entrypoint as the canonical version source; preserved runtime package versions remain historical. Update the root catalog and changelog, validate the manifest and verify discovery against a public-files-only export, including full-depth discovery. Do not publish private `.runs` evidence or recreate a public `SKILL.md` merely to satisfy validation. Structural validation may use an isolated temporary copy of the preserved historical frontmatter; remove the temporary copy afterward.

## Instruction and skill design

Keep triggers precise and entrypoints focused on essential decisions, constraints and links. Put conditional mechanics and evidence in references, preferably one level deep. Do not add per-skill READMEs, changelogs, journals or product-specific `agents/openai.yaml` unless the user requests them or the repository explicitly adopts them. Preserve supported workflows and resource compatibility.

The [Astra skill and prompt guidance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) informs engineering-agent instructions: avoid redundant prerequisites and give the agent room to finish authorized work. The [latest-model guide](https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices) recommends testing prompt simplifications on representative workloads. These are not evidence that Jev can replace its runtime safeguards or acquire Astra's capabilities. Evaluate changes to Jev's observations, prompts and controller on Jev itself; preserve mechanisms that enforce authorization, exact values, effect scope and benchmark isolation. Verify time-sensitive compatibility facts against current official sources.

## Validation and completion

Complete checks proportional to the changed behavior, reusing results for an unchanged fingerprint. Rerun affected checks after new changes or failures; avoid repeating an already-passing full suite without a reason.

- For each changed skill, run the skill-creator structural validator and check changed links/resource paths.
- Run relevant fixtures, tests or forward evaluations. Benchmark claims additionally require the campaign's frozen comparison and independent outcome audit; unit tests alone cannot establish improvement.
- Run `python3 .agents/scripts/validate_release_contract.py` (use the appropriate `--base-ref` for CI or committed comparisons), resolve failures, and confirm the intentional versions and changelog coverage.
- Run `git diff --check` and inspect the final diff for unrelated changes.
- Remove only validation-owned temporary files, containers, images, networks and volumes when no active run needs them. Preserve audit evidence and source snapshots; never use destructive global cleanup.

Report validation, unexercised areas, limitations, scoped cleanup and final versions. Continue justified implementation and evaluation until the requested acceptance conditions are met, or identify a concrete blocker; do not replace those conditions with an easier score.

## Commits and publication

Commit, push, tag or publish only when requested. Never tag an uncommitted tree. Tag a committed skill release as `<skill-name>/v<version>` and create its GitHub Release from the matching committed changelog entry.
