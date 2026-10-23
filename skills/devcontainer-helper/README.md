# 🛠️ DevContainer Helper

Design, audit, and troubleshoot Dev Container and GitHub Codespaces environments. The skill helps choose an image, Dockerfile, or Compose setup, place lifecycle work, manage Features and lockfiles, and validate the environments the project actually needs.

## Install

```bash
npx skills add gabeosx/agent-skills --skill devcontainer-helper
```

Choose your agent when prompted. See the [repository installation guide](../../README.md#install-a-skill) for CLI requirements and installation scope.

## Use it

Give the agent access to the repository and say where the environment must run. Include required languages, services, architectures, secrets, ports, and persistence when those requirements are not already documented.

For example:

> Audit our existing .devcontainer configuration for local Docker and Codespaces. Preserve the distro and language versions, explain any required changes, and test both targets where available.

> Create a development environment for this project with PostgreSQL as a sidecar. Verify the image and Features against current official sources, commit the Feature lockfile, and document the startup checks.

The agent inspects existing configuration before proposing a new environment. It preserves working choices unless the request or evidence calls for a migration, and verifies time-sensitive images, Features, and runtime support instead of guessing current defaults.

## Requirements and validation

Planning and review use repository files and current upstream documentation. Local build checks also need the Dev Container CLI and an appropriate runtime, such as Docker or Podman. Codespaces and other targets need their own access and validation; an untested target is reported explicitly.

Registry credentials or runtime-specific permissions may be needed for the chosen environment. Secrets belong outside committed configurations and images. Host Docker access carries broad authority, so the skill considers explicit sidecar services before adding a socket mount or nested daemon.

Validation covers resolved configuration, image builds, lockfile behavior, startup, and execution as the intended remote user when the target is available. Cleanup is limited to resources created for the task. Installing the skill does not install or start a container runtime.

## Further guidance

- [Agent instructions](SKILL.md): architecture choices, reproducibility, security, and the expected result report.
- [Decision guide](references/decision-guide.md): source selection and environment shape.
- [Configuration guide](references/configuration.md): lifecycle placement, current configuration shapes, and Codespaces differences.
- [Validation guide](references/validation.md): checks, failure handling, and cleanup.
- [Image-based starter](assets/devcontainer-template.json): use after choosing the environment shape, replacing every placeholder before delivery.
