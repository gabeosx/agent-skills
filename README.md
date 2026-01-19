# Agent Skills

A collection of specialized skills following the open standard for agent capabilities.

## Included Skills

### 🍎 [Apple Container Skill](./skills/apple-container-skill)
Interact with the Apple Container CLI to manage containers, images, volumes, networks, and system services on macOS.
- **Key Features:** System lifecycle management, networking setup, and persistent data handling for Apple's native container runtime.

### 🛠️ [DevContainer Helper](./skills/devcontainer-helper)
Create, configure, and manage `devcontainer.json` environments.
- **Key Features:** Supports image-based, Dockerfile, and Docker Compose setups with automated "Features" integration and lifecycle scripts.

### 🎨 [UX Designer](./skills/ux-designer)
Expert UX/UI design assistant based on the "Refactoring UI" philosophy.
- **Key Features:** Logic-based design rules, strict hierarchy enforcement, complete design system tokens, and production-ready specification generation.

## Usage

These skills are designed to be dropped into your agent's skills directory.

```bash
# Example: Symlink a skill to your agent's skills location
ln -s $(pwd)/skills/apple-container-skill /path/to/agent/skills/
```
