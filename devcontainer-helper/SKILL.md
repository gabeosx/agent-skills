---
name: devcontainer-helper
description: Use this skill when the user asks to create, configure, update, or explain a `devcontainer.json` file or development container environment.
---

# DevContainer Helper

This skill assists in creating and managing `devcontainer.json` files for consistent development environments.

## Workflow

### 1. specific Requirements

Before generating the file, determine the user's needs:
- **Base Environment**: Do they want a pre-built image (e.g., Ubuntu, Python, Node), a custom `Dockerfile`, or a `docker-compose.yml` setup?
- **Languages & Tools**: What languages (Node.js, Python, Go, Rust, etc.) and tools (Git, CLI utilities) are needed?
- **Extensions**: Are there specific VS Code extensions required?
- **Ports**: What ports need to be forwarded?

### 2. Generate Configuration

Use the template in `assets/devcontainer-template.json` as a starting point.

**For Image-based (Simplest):**
Use the `image` property. Add `features` for additional tools.

**For Dockerfile:**
Use `build.dockerfile` property pointing to their Dockerfile.

**For Docker Compose:**
Use `dockerComposeFile` and `service` properties.

### 3. Service Architecture Principles
- **Prefer Sidecars over In-Container Tools**: For databases, caches, or message brokers, use dedicated services in `docker-compose.yml` rather than installing them via `Dockerfile` or `features`. This improves build times, resource isolation, and container startup performance.
- **Sidecars over Docker-in-Docker (DinD)**: When external services are needed for development/testing, prefer sidecar containers over DinD to reduce overhead and avoid the security complexities of privileged containers.

### 4. Add Features

Encourage using "Features" over manual `Dockerfile` commands for better maintainability and **Dependabot** support.
Common features:
- **Node.js**: `ghcr.io/devcontainers/features/node:1` (Use versioned tags like `version: "22"` to enable automated updates).
- **Playwright**: `ghcr.io/devcontainers/features/playwright:1` (Crucial for installing OS-level browser dependencies).
- **pnpm**: `ghcr.io/devcontainers-contrib/features/pnpm:2`.
- **Docker-in-Docker**: `ghcr.io/devcontainers/features/docker-in-docker:2`.
- **Git**: `ghcr.io/devcontainers/features/git:1`.

### 5. Performance Optimization: "Baking for Speed"
- **Strategy**: Move global tool installations (e.g., `npm install -g cli-tool`) from `postCreateCommand` into a custom `Dockerfile`.
- **Benefit**: This "bakes" the tools into the image layers, making daily container startup significantly faster as these tools are cached rather than re-installed.
- **Implementation**: Reference the `Dockerfile` in `docker-compose.yml` or `devcontainer.json`.

### 6. Lifecycle Scripts vs. Features
- **Prefer Features** for language runtimes and system tools (to get automated updates).
- **Use Lifecycle Scripts** (`postCreateCommand`) only for local project setup like `pnpm install` or database migrations.
- **Permissions**: Use specialized features or `remoteUser` context to handle volume permission issues instead of manual `chown` in scripts where possible.

### 7. Automation & Dependabot
- Always recommend adding `devcontainers` to `.github/dependabot.yml` when using Features. This ensures the dev environment stays up-to-date automatically.

## References

See [references/cheatsheet.md](references/cheatsheet.md) for a list of common `devcontainer.json` properties and valid values.