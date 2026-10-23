# Agent Skills

Reusable instructions for agents working on writing, development environments, design, and transcripts. Each skill has its own version and follows the [Agent Skills specification](https://agentskills.io/specification).

## Install a skill

From the project where you want to use it, run:

```bash
npx skills add gabeosx/agent-skills --skill natural-writing
```

Choose the target agent when prompted. The [skills CLI](https://github.com/vercel-labs/skills) requires Node.js 22.20 or later and installs to the current project by default. Add `-g` for an installation across projects, or select Codex explicitly:

```bash
npx skills add gabeosx/agent-skills --skill natural-writing -a codex
```

To see the available skills before installing:

```bash
npx skills add gabeosx/agent-skills --list
```

Read the selected skill's instructions for runtime dependencies. Natural Writing requires no runtime tools or external services.

For a local checkout, you can also link a skill into your agent's skills directory. Replace the destination below with that directory's actual path:

```bash
ln -s "$PWD/skills/natural-writing" /path/to/agent/skills/natural-writing
```

## Choose a skill

### ✍️ [Natural Writing](./skills/natural-writing)

Drafting, editing, and reviewing prose with fewer generic AI writing habits. Preserves facts, uncertainty, voice, and useful detail; selects content for the reader; makes procedural checks actionable. Includes contextual examples and [comparison studies](evaluations/natural-writing/procedural-writing/REPORT.md). It does not judge authorship or promise detector evasion.

### 🧪 [Benchmark Improvement Loop](./skills/benchmark-improvement-loop)

Adding benchmarks and improving skills through comparable trials, independent outcome checks, separate development and confirmation sets, and recorded costs and failures. Repository agent instructions route benchmark work here.

### 🍎 [Apple Container Skill](./skills/apple-container-skill)

Running and troubleshooting Apple's `container` CLI on Apple silicon macOS: images, registries, networks, volumes, Container Machines, SSH forwarding, and experimental local Kubernetes. Guidance covers release differences and security fixes through 1.5.0.

### 🛠️ [DevContainer Helper](./skills/devcontainer-helper)

Designing and repairing Dev Containers and GitHub Codespaces: architecture, LTS images and Features, lockfiles, authentication, Docker access, prebuilds, WSL compatibility, and runtime validation.

### 🎨 [UX Designer](./skills/ux-designer)

Applying Refactoring UI principles to hierarchy, spacing, typography, responsive layouts, data-heavy interfaces, components, and design tokens.

### 🔄 [GitHub Scrum Flow](./skills/github-scrum-flow)

Coordinating tracks, backlog items, GitHub issues, and branches through a PR-first Issue ↔ Track ↔ Branch workflow.

### 🎙️ [MacWhisper](./skills/macwhisper)

Listing and searching local transcriptions, fetching diarized transcripts with filtering, and tracking processed sessions. Includes UTC time windows for calendar lookup. Requires macOS, MacWhisper, Node.js, and `sqlite3`.

## Archived research

[Agent Browser Jev](./skills/agent-browser-jev) was retired on October 2, 2026. Its research report, evidence register, historical source, costs, failed experiments, and final NO-GO decisions remain available. The archive has no public `SKILL.md` and is excluded from installation discovery. Existing copies, old commits, tags, and forks remain available independently.

## Versions and releases

Skills use [Semantic Versioning](https://semver.org/) independently. An active skill's quoted `metadata.version` in `SKILL.md` is its canonical version; the root [changelog](CHANGELOG.md) records release history in [Keep a Changelog](https://keepachangelog.com/en/2.0.0/) format. Earlier unversioned development remains in Git history.

- **Major:** incompatible changes to triggering, required inputs, guarantees, outputs, or resource paths.
- **Minor:** compatible additions to capabilities, workflows, or material guidance.
- **Patch:** compatible corrections and clarifications.

To prepare a release:

1. Update the skill's version and matching changelog entry together.
2. Run `python3 .agents/scripts/validate_release_contract.py`, the skill-creator structural validator, and the checks relevant to that skill. Repository contributors should read [.agents/AGENTS.md](.agents/AGENTS.md) for the full requirements.
3. Commit or merge the validated change, then tag that commit as `<skill-name>/v<version>`, for example `natural-writing/v1.0.0`.
4. If creating a GitHub Release, use the matching committed changelog entry.

Tag only committed changes. A retired skill removes `SKILL.md` and records its name, archived status, retirement version, and research paths in `ARCHIVE.json`. That manifest's `metadata.version` becomes the archive-contract version; retained executable package versions stay historical. The release validator checks the manifest and rejects public `SKILL.md` entrypoints inside archived directories.
