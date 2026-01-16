# Agent Skills

A collection of specialized skills for the Gemini CLI agent.

## Included Skills

### 🍎 [Apple Container Skill](./skills/apple-container-skill)
Interact with the Apple Container CLI to manage containers, images, volumes, networks, and system services on macOS.
- **Key Features:** System lifecycle management, networking setup, and persistent data handling for Apple's native container runtime.

### 🛠️ [DevContainer Helper](./skills/devcontainer-helper)
Create, configure, and manage `devcontainer.json` environments.
- **Key Features:** Supports image-based, Dockerfile, and Docker Compose setups with automated "Features" integration and lifecycle scripts.

## Installation

To use these skills with your Gemini CLI, you can symlink them into your `.gemini/skills` directory:

```bash
ln -s $(pwd)/skills/apple-container-skill ~/.gemini/skills/
ln -s $(pwd)/skills/devcontainer-helper ~/.gemini/skills/
```

Alternatively, if you are managing a project-specific skill set, ensure the `.gemini/skills` directory points to these locations.
