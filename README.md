# Agent Skills

A collection of specialized skills following the open standard for agent capabilities.

## Included Skills

### 🍎 [Apple Container Skill](./skills/apple-container-skill)
Interact with the Apple Container CLI to manage containers, images, volumes, networks, and system services on macOS.
- **Key Features:** System lifecycle management, networking setup, and persistent data handling for Apple's native container runtime.

### 🛠️ [DevContainer Helper](./skills/devcontainer-helper)
Create, configure, and manage `devcontainer.json` environments.
- **Key Features:** Supports image-based, Dockerfile, and Docker Compose setups with Service Architecture Principles (sidecars over DinD), Performance Optimization (baking for speed), and automated "Features" integration with Dependabot support.

### 🎨 [UX Designer](./skills/ux-designer)
Expert UX/UI design assistant based on the "Refactoring UI" philosophy.
- **Key Features:** Logic-based design rules, strict hierarchy enforcement, complete design system tokens, Responsive Design & Robustness rules, Data-Dense Interface Principles, and Component Standards.

### 🔄 [GitHub Scrum Flow](./skills/github-scrum-flow)
Unified expert for Project Management (Scrum/Agile) and GitHub Flow enforcement.
- **Key Features:** Track orchestration, backlog hygiene, GitHub Issue synchronization, branch management, and enforcing strict PR-first workflows (Issue <-> Track <-> Branch).

### 🎙️ [MacWhisper](./skills/macwhisper)
Read-only access to [MacWhisper](https://goodsnooze.gumroad.com/l/macwhisper) transcription sessions from its local SQLite database. Zero configuration for a standard MacWhisper install.
- **Key Features:** List unprocessed recordings, fetch diarized transcripts with hallucination filtering, keyword search, processed-session state tracking, and UTC time windows for calendar enrichment.

## Usage

These skills are designed to be dropped into your agent's skills directory.

```bash
# Example: Symlink a skill to your agent's skills location
ln -s $(pwd)/skills/apple-container-skill /path/to/agent/skills/
```
