# Agent Skills

A collection of specialized skills following the open standard for agent capabilities.

## Included Skills

### 🍎 [Apple Container Skill](./skills/apple-container-skill)
Interact with the Apple Container CLI to manage containers, images, volumes, networks, and system services on macOS.
- **Key Features:** System lifecycle management, networking setup, and persistent data handling for Apple's native container runtime.

### 🛠️ [DevContainer Helper](./skills/devcontainer-helper)
Design, audit, troubleshoot, and optimize Dev Container and GitHub Codespaces environments.
- **Key Features:** Inspection-first architecture choices, current image and Feature verification, explicit LTS selection, sidecar and Docker-access safety, Feature lockfiles and Dependabot, Codespaces prebuild guidance, runtime portability, and end-to-end validation.

### 🎨 [UX Designer](./skills/ux-designer)
Expert UX/UI design assistant based on the "Refactoring UI" philosophy.
- **Key Features:** Logic-based design rules, strict hierarchy enforcement, complete design system tokens, Responsive Design & Robustness rules, Data-Dense Interface Principles, and Component Standards.

### 🔄 [GitHub Scrum Flow](./skills/github-scrum-flow)
Unified expert for Project Management (Scrum/Agile) and GitHub Flow enforcement.
- **Key Features:** Track orchestration, backlog hygiene, GitHub Issue synchronization, branch management, and enforcing strict PR-first workflows (Issue <-> Track <-> Branch).

### 🎙️ [MacWhisper](./skills/macwhisper)
Read-only access to [MacWhisper](https://goodsnooze.gumroad.com/l/macwhisper) transcription sessions from its local SQLite database. Zero configuration for a standard MacWhisper install.
- **Key Features:** List unprocessed recordings, fetch diarized transcripts with hallucination filtering, keyword search, processed-session state tracking, and UTC time windows for calendar enrichment.

## Versioning and Releases

Each skill is versioned independently according to [Semantic Versioning 2.0.0](https://semver.org/). The canonical machine-readable version is the quoted `metadata.version` value in that skill's `SKILL.md` frontmatter. A repository-wide [CHANGELOG.md](./CHANGELOG.md), maintained in the style of [Keep a Changelog](https://keepachangelog.com/en/2.0.0/), is the canonical human-readable release history.

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

```bash
# Example: Symlink a skill to your agent's skills location
ln -s $(pwd)/skills/apple-container-skill /path/to/agent/skills/
```
