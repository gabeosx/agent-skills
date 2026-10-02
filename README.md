# Agent Skills

A collection of specialized skills following the open standard for agent capabilities.

## Included Skills

### 🧪 [Benchmark Improvement Loop](./skills/benchmark-improvement-loop)
Introduce a benchmark and run an auditable test–verify–improve campaign for an agent skill. It separates first-attempt results, targeted retries, and untouched holdouts; requires independent outcome checks, scoped infrastructure, spend accounting, and evidence-backed changes. The repository's agent instructions route benchmark work through this skill.

### 🍎 [Apple Container Skill](./skills/apple-container-skill)
Interact with the Apple Container CLI to manage containers, images, volumes, networks, and system services on macOS.
- **Key Features:** Release-aware security guidance through Apple Container 1.4.1, system lifecycle and diagnostics, current Container Machine selection, build SSH forwarding, safe isolation paths, scoped filesystem cleanup, and experimental local Kubernetes.

### 🛠️ [DevContainer Helper](./skills/devcontainer-helper)
Design, audit, troubleshoot, and optimize Dev Container and GitHub Codespaces environments.
- **Key Features:** Inspection-first architecture choices, current image and Feature verification, explicit LTS selection, sidecar and Docker-access safety, Feature lockfiles and Dependabot, OCI authentication hardening, Codespaces prebuild guidance, WSL Containers version checks, runtime portability, and end-to-end validation.

### 🎨 [UX Designer](./skills/ux-designer)
Expert UX/UI design assistant based on the "Refactoring UI" philosophy.
- **Key Features:** Logic-based design rules, strict hierarchy enforcement, complete design system tokens, Responsive Design & Robustness rules, Data-Dense Interface Principles, and Component Standards.

### 🔄 [GitHub Scrum Flow](./skills/github-scrum-flow)
Unified expert for Project Management (Scrum/Agile) and GitHub Flow enforcement.
- **Key Features:** Track orchestration, backlog hygiene, GitHub Issue synchronization, branch management, and enforcing strict PR-first workflows (Issue <-> Track <-> Branch).

### 🎙️ [MacWhisper](./skills/macwhisper)
Read-only access to [MacWhisper](https://goodsnooze.gumroad.com/l/macwhisper) transcription sessions from its local SQLite database. Zero configuration for a standard MacWhisper install.
- **Key Features:** List unprocessed recordings, fetch diarized transcripts with hallucination filtering, keyword search, processed-session state tracking, and UTC time windows for calendar enrichment.

## Archived Research

### [Agent Browser Jev](./skills/agent-browser-jev/RESEARCH.md)

Archived October 2, 2026. The comprehensive research report preserves the browser-delegation trials, public benchmark studies, caller comparisons, failed architectures, costs and final NO-GO decisions. The [evidence register](./skills/agent-browser-jev/EVIDENCE.md) identifies public artifacts and private-source limits. Its source remains for research, but `SKILL.md` and installation guidance have been removed. Jev is no longer offered as an installable skill in this repository tree; historical versions and existing copies remain available independently.

## Versioning and Releases

Each skill is versioned independently according to [Semantic Versioning 2.0.0](https://semver.org/). The canonical machine-readable version is the quoted `metadata.version` value in that skill's `SKILL.md` frontmatter. A repository-wide [CHANGELOG.md](./CHANGELOG.md), maintained in the style of [Keep a Changelog](https://keepachangelog.com/en/2.0.0/), is the canonical human-readable release history.

An intentionally retired skill removes `SKILL.md` and records its name, archived status, incompatible retirement version and retained research paths in `ARCHIVE.json`. Its `metadata.version` becomes the canonical archive-contract version. Preserved executable package versions describe historical source and remain unchanged. The release validator checks the archive manifest and rejects public `SKILL.md` files inside an archived directory.

- **Major:** An incompatible change to triggering, required inputs, behavioral guarantees, outputs, or resource layout.
- **Minor:** A backward-compatible capability, workflow, or material guidance improvement.
- **Patch:** A backward-compatible correction or clarification that does not add a material capability.

For each release:

1. Update `metadata.version` and `CHANGELOG.md` in the same change.
2. Run `python3 .agents/scripts/validate_release_contract.py`, the skill structural validator, and any skill-specific tests.
3. Commit or merge the release change.
4. Tag that commit as `<skill-name>/v<version>` (for example, `devcontainer-helper/v1.0.0`). A GitHub Release may then be created from the matching changelog entry.

Never tag an uncommitted working tree. The versions established here are the first formal baselines; earlier unversioned development remains available in Git history.

## Usage

These skills are designed to be dropped into your agent's skills directory.

Install a selected skill using the [skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add gabeosx/agent-skills --skill apple-container-skill
```

Consult the selected active skill's instructions for any dependencies. Archived research directories are excluded from the installable catalog.

```bash
# Example: Symlink a skill to your agent's skills location
ln -s $(pwd)/skills/apple-container-skill /path/to/agent/skills/
```
