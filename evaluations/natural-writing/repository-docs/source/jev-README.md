# Agent Browser Jev — archived research

**Archived October 2, 2026. This project is discontinued as an installable skill. Please do not install it.**

Read the [comprehensive research report](RESEARCH.md) for the methods, results, failed experiments, caller costs, benchmark-integrity corrections and final NO-GO decisions. The [evidence register](EVIDENCE.md) maps the retained trials, public artifacts and private evidence boundaries.

Early authored workflows showed useful speed and component coverage. Broader public-task experiments remained inconsistent, caller recovery often cost more, and the final standalone and architecture pilots did not establish a usable improvement. The planned 48-task confirmation study was never run. The archive preserves those limits alongside the successes.

## What is retained

- [Research report](RESEARCH.md) and [evidence register](EVIDENCE.md).
- [Detailed historical studies](references/) and public synthetic [JSON evidence](references/evidence/).
- [Curated final-trial summaries](references/archive-trials/).
- [Historical instructions](SKILL.archived.md), [runtime source](scripts/) and [evaluation source](tests/).
- [Archive manifest](ARCHIVE.json) and [MIT license](LICENSE).

## Installation is retired

The standard installer is `npx skills`. This archive removes `SKILL.md`, so Jev is absent from discovery in the updated repository tree, including full-depth discovery. The existing directory is retained to keep research links stable. Hiding an entrypoint with internal metadata would still allow explicit installation; the entrypoint has instead been removed.

The change takes effect for GitHub installations when published to the default branch. Existing installations, historical commits/tags and forks remain available independently. Other skills in this repository remain installable. See the CLI's [discovery source](https://github.com/vercel-labs/skills/blob/main/src/skills.ts) and [documentation](https://github.com/vercel-labs/skills#skill-discovery).

## Historical code

The executable package remains at its preserved 1.3.0 research version; the incompatible distribution retirement is recorded as archive contract 2.0.0 in `ARCHIVE.json` and the repository changelog. Historical narratives and candidate numbers describe their original frozen snapshots. They do not represent a currently supported release.

Paid runners that require the former `SKILL.md`, benchmark services or private frozen sources are retained for inspection and are no longer a supported turnkey interface. This archive provides no setup or installation quickstart. Private `.runs` records remain ignored; the public report and curated summaries identify their availability limits.
