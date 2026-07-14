# Dev Container Decision Guide

Use this reference when selecting images, Features, service topology, container-engine access, or target runtimes.

## Choose A Primary Configuration

| Need | Prefer | Reason |
| --- | --- | --- |
| Maintained environment already fits | `image` | Smallest configuration and fastest adoption |
| OS packages, native libraries, certificates, or baked tools | `build` plus Dockerfile | Reproducible cached image layers |
| Database, cache, broker, emulator, or multiple services | Docker Compose | Explicit service boundaries and persistence |
| Modular developer tool with a trustworthy maintainer | Feature | Declarative configuration, lockfile, and update support |

These choices compose. A Compose development service may be built from a Dockerfile and use Features.

Do not choose Docker Compose solely because the repository already has a production Compose file. A small development override can reuse it only when the service model, mounts, and lifecycle are actually compatible.

## Select A Base Image

For an existing project:

1. Preserve its pinned distro and language family by default.
2. Check runtime/version files and CI for compatibility constraints.
3. Treat an OS-major change as a migration with an explicit reason and validation.

For a greenfield project:

1. Prefer a maintained language-specific Dev Container image when it cleanly matches the project's runtime policy.
2. Otherwise choose a generic supported base and install modular runtimes through verified Features.
3. For generic Ubuntu, identify the newest LTS from <https://ubuntu.com/about/release-cycle> or another official Ubuntu release page.
4. Find the intended explicit variant in the Dev Container base-image manifest and Microsoft Container Registry tags:
   - <https://github.com/devcontainers/images/blob/main/src/base-ubuntu/manifest.json>
   - <https://mcr.microsoft.com/v2/devcontainers/base/tags/list>
5. Confirm that the registry manifest is actually consumable for every target architecture, for example with `docker buildx imagetools inspect mcr.microsoft.com/devcontainers/base:ubuntuYY.MM`, `docker manifest inspect`, or an actual build.
6. Emit `mcr.microsoft.com/devcontainers/base:ubuntuYY.MM`, with the verified release substituted for `YY.MM`.

Do not use `:ubuntu`, `:latest`, or an assumed calendar-derived release. Source manifests describe publication intent; the registry manifest or a successful pull/build proves availability. “Newest Ubuntu” and “newest Ubuntu LTS published by the required Dev Container image for all target architectures” are not automatically the same thing.

## Select And Maintain Features

1. Search <https://containers.dev/features> at task time.
2. Prefer the official `devcontainers/features` collection when it meets the need.
3. Read the Feature documentation, options, dependencies, supported platforms, and source.
4. Use the major Feature reference recommended by the current documentation; do not copy a major from this skill or memory.
5. Generate and commit the Feature lockfile through the current CLI.
6. Add Dependabot `devcontainers` version updates when the repository uses GitHub.

Before using a third-party Feature, verify:

- The publisher and source repository are identifiable.
- Releases and security fixes are maintained.
- Required architectures are published.
- Install scripts do not add unjustified repositories, credentials, privileges, or persistent daemons.
- The Feature does not duplicate functionality already offered by the base image or another selected Feature.

Special cases:

- **Node and pnpm:** inspect the current official Node Feature options. Use its pnpm support when available instead of stacking a separate pnpm Feature.
- **Playwright:** there is no assumed official Dev Container Playwright Feature. Follow the [official Playwright Docker guidance](https://playwright.dev/docs/docker), use a version-matched official image or the project's installed Playwright version with `playwright install --with-deps`, and keep the browser package and image/tool versions aligned.
- **Git:** do not add a Git Feature merely because it is common; first confirm the selected image does not already provide an adequate version.

## Choose A Service And Docker Strategy

Use one service per database, cache, broker, or emulator. Give persistent state an explicit named volume only when it should survive container recreation. Add health checks when application startup depends on readiness.

For container-driven development or tests:

| Requirement | Preferred approach |
| --- | --- |
| Known database/cache/broker dependency | Compose sidecar |
| Testcontainers or arbitrary local Docker commands | Host daemon/socket only after accepting host-equivalent authority and portability limits |
| Disposable isolated Docker daemon or Docker-engine testing | Docker-in-Docker, with privilege and storage costs documented |
| No container workload inside the dev environment | No Docker Feature or socket mount |

Never select DinD just to run a known service. Never expose a host Docker socket to untrusted repository code.

## Apply The Decisions

- **Existing project on an older supported LTS:** preserve its explicit distro tag. Propose an upgrade separately with compatibility evidence; do not rewrite it merely because a newer LTS exists.
- **Greenfield Node plus PostgreSQL:** verify a base image and the current official Node Feature, use its pnpm option when required, and put PostgreSQL in a Compose sidecar with a health check and explicit persistence policy. Place deterministic package installation where Codespaces prebuilds can capture it.
- **Playwright project:** align the browser environment with the project's Playwright version through an official image or project-driven dependency installation; do not fabricate an official Feature.
- **Repository that runs arbitrary container builds:** explain the host-socket authority and portability tradeoff. Choose DinD only when an isolated daemon is part of the requirement, not as a generic convenience.

## Choose Lifecycle Placement

| Work | Lifecycle |
| --- | --- |
| Host prerequisite check | `initializeCommand` |
| Deterministic first-time dependency installation | `onCreateCommand` |
| Dependency refresh after source changes | `updateContentCommand` |
| Secret-dependent login, per-instance migration, or permissions | `postCreateCommand` |
| Cheap service/bootstrap action after every start | `postStartCommand` |
| Interactive shell/editor greeting or client setup | `postAttachCommand` |

For Codespaces prebuilds, favor `onCreateCommand` and `updateContentCommand` for expensive deterministic work. Keep user-specific and secret-dependent work out of prebuild layers.

## Target Runtime Guidance

- **Docker:** baseline implementation target, but still validate architecture, user, mounts, and Compose behavior.
- **Podman:** target only when requested or already used. Validate Docker-compatible socket assumptions, Compose support, UID mapping, and Feature behavior rather than claiming transparent compatibility.
- **GitHub Codespaces:** avoid host-path assumptions. Consider prebuilds, `hostRequirements`, port visibility, secrets, default-image storage behavior, and organization policy.
- **WSL Containers:** consult current Microsoft and Dev Container CLI documentation. While marked preview, present it as an opt-in Windows runtime and enumerate unsupported Docker flags or Compose behavior relevant to the project.
- **CI/prebuilt images:** use `devcontainers/ci` when publishing a reusable environment. For multiple architectures, use native runner matrices and manifest merging when available instead of defaulting to QEMU.

Official starting points:

- Dev Container specification: <https://containers.dev/implementors/spec/>
- Dev Container CLI: <https://github.com/devcontainers/cli>
- GitHub Codespaces configuration: <https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/configuring-dev-containers>
- Codespaces prebuilds: <https://docs.github.com/en/codespaces/prebuilding-your-codespaces/about-github-codespaces-prebuilds>
- WSL Containers: <https://learn.microsoft.com/windows/wsl/wsl-container>
- Multi-platform Dev Container CI: <https://github.com/devcontainers/ci/blob/main/docs/multi-platform-builds.md>
