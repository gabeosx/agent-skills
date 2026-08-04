# Changelog

All notable skill changes are recorded in this file. Each skill is versioned independently according to [Semantic Versioning 2.0.0](https://semver.org/), and this file follows [Keep a Changelog 2.0.0](https://keepachangelog.com/en/2.0.0/). The canonical version of a skill is the quoted `metadata.version` value in its `SKILL.md` frontmatter.

## Unreleased

### Repository

- Added canonical agent instructions and a dependency-free release-contract validator requiring every affected skill change to include an independent Semantic Version increment, a matching root changelog entry, relevant validation, and scoped cleanup evidence.
- Required repository-only changes to be recorded without inventing unrelated skill version bumps, and documented the definition of done and release-tagging workflow.

## apple-container-skill 1.1.0 - 2026-08-04

### Added

- Added release-aware symptom routing for Apple Container 1.1 and 1.2 fixes, including relative copy paths, non-root Unix sockets, environment inheritance, build contexts, published-port stalls, and machine timeouts.
- Added decision guidance and live-tested workflows for host-created versus container-created Unix sockets, explicit environment passthrough, justified kernel arguments, service-first port diagnosis, and shutdown signals.
- Added diagnostic probes for the shipped `run` command surface and blind forward evaluations for machine automation and socket troubleshooting outcomes.

### Changed

- Replaced the incomplete Alpine machine recipe with a validated `openrc-init` image and documented the PTY-backed first-run initialization boundary for later headless automation.
- Reframed new 1.2 capabilities around when and why to use them, verification steps, security implications, and upgrade-before-workaround decisions instead of merely enumerating flags.
- Updated runtime evidence from the signed Apple Container 1.2.0 payload on macOS 26.5 arm64.

### Fixed

- Corrected shutdown guidance after confirming the shipped 1.2.0 CLI does not expose the release-note-only `container run --stop-signal`; agents now use image `STOPSIGNAL` or `container stop -s`.

## devcontainer-helper 1.0.0 - 2026-07-14

First formal versioned release. Earlier development was unversioned and remains in Git history.

### Added

- An inspection-first workflow that makes agents discover repository constraints before choosing an environment architecture.
- Decision guidance for selecting a base image, Dockerfile, or Compose topology, with databases, caches, brokers, and other supporting services defaulting to sidecars.
- Task-time verification of Ubuntu LTS images and Features against official sources, including architecture support and third-party Feature vetting.
- Security guidance for non-root operation, trusted Features, least privilege, secret handling, Docker socket risk, and justified use of Docker-in-Docker.
- Reproducibility guidance for `devcontainer-lock.json`, frozen-lockfile CI validation, Dependabot's `devcontainers` ecosystem, prebuilt images, and native amd64/arm64 CI.
- Codespaces guidance for prebuild-aware lifecycle placement, `hostRequirements`, recommended-secret metadata, port visibility, mount limitations, and `customizations.codespaces`.
- Compatibility guidance for Docker, Podman, Codespaces, and preview WSL Containers.
- Progressive references for architectural decisions, current configuration patterns, validation, troubleshooting, and scoped cleanup.
- A minimal parameterized starter template whose verified image and context-dependent values must replace explicit sentinels before delivery.

### Changed

- Reframed the skill from a configuration generator into an architecture, security, portability, maintenance, and validation guide.
- Preserved an existing project's distro by default and prohibited silent OS-major upgrades.
- Required explicit Ubuntu release tags; floating `:ubuntu` and `:latest` tags are no longer acceptable.
- Made lifecycle recommendations deterministic and Codespaces-prebuild aware, including the parallel execution behavior of object-form lifecycle commands.
- Routed Playwright environments to the official Playwright image or project-version-matched installation instead of an invented official Feature.
- Preferred the official Node Feature's pnpm option when appropriate.

### Removed

- The stale monolithic cheatsheet and legacy top-level Dockerfile/context examples.
- Hard-coded Feature recommendations that could become stale, including the nonexistent official Playwright Feature.
- Floating Ubuntu defaults and unjustified all-in-one, privileged, or Docker-in-Docker architectures.

## apple-container-skill 1.0.0 - 2026-07-14

### Added

- Established the current skill as its first formal versioned baseline. Earlier unversioned development remains in Git history.

## github-scrum-flow 1.0.0 - 2026-07-14

### Added

- Established the current skill as its first formal versioned baseline. Earlier unversioned development remains in Git history.

## macwhisper 1.0.0 - 2026-07-14

### Added

- Established the current skill as its first formal versioned baseline. Earlier unversioned development remains in Git history.

## ux-designer 1.0.0 - 2026-07-14

### Added

- Established the current skill as its first formal versioned baseline. Earlier unversioned development remains in Git history.
