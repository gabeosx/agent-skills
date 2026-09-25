# Changelog

All notable skill changes are recorded in this file. Each skill is versioned independently according to [Semantic Versioning 2.0.0](https://semver.org/), and this file follows [Keep a Changelog 2.0.0](https://keepachangelog.com/en/2.0.0/). The canonical version of a skill is the quoted `metadata.version` value in its `SKILL.md` frontmatter.

## Unreleased

### Repository

- Added CI for Agent Browser Jev's offline regression suite on Node 20.3.0 and 24, including symlink installation behavior and the repository release contract.

- Added Agent Browser Jev to the skill catalog with `npx skills` installation guidance and a detailed human-facing README requested for this skill.

- Added canonical agent instructions and a dependency-free release-contract validator requiring every affected skill change to include an independent Semantic Version increment, a matching root changelog entry, relevant validation, and scoped cleanup evidence.
- Required repository-only changes to be recorded without inventing unrelated skill version bumps, and documented the definition of done and release-tagging workflow.

## agent-browser-jev 0.1.1 - 2026-09-24

### Fixed

- Fixed CLI execution through symlinked files and skill directories; the previous entrypoint could silently exit with success without running.
- Preserved the previous observed screen and explicit caller-supplied values in Jev's request, so progress and fill decisions retain their context.

### Added

- Added an opt-in real-browser/real-Jev suite using general-purpose local fixtures, independent event/readback assertions, source hashes, model charges, elapsed times and scoped cleanup. Published all development attempts as well as the passing six-scenario run.
- Added regression coverage for symlink entrypoints and retained prior observation context, bringing the offline suite to 24 tests.

### Changed

- Made the README and skill instructions application-neutral. Replaced private historical prototype timing claims with reproducible measurements of the current packaged CLI, explicit claim-to-test mappings and a documented proof boundary.

## agent-browser-jev 0.1.0 - 2026-09-24

### Added

- Introduced a portable Jev-assisted browser action loop, CLI, pinned dependencies and 22 tests. The helper reuses an existing agent-browser session, accepts caller-owned permissions/privacy and secret loading, and returns model-assessed progress with observed evidence.
- Documented installation with `npx skills`, API/CLI integration, original design rationale, historical prototype comparisons and the separate live read-only acceptance of the generic helper.
- Kept business logic, site-specific permissions, credentials and private browser evidence outside the shared package. Initial live acceptance is supervised read-only Xero use; arbitrary-site reliability and consequential writes are not established.

## apple-container-skill 1.2.0 - 2026-09-20

### Added

- Added experimental single-node `container k8s` workflows, scoped `container clean` guidance, build-time SSH forwarding, additive masked/read-only path controls, and diagnostics for the current command surface.
- Added security routing for Apple Container 1.3.1 and 1.4.1 fixes affecting crafted identifiers, image layers and layouts, registry authentication, and host-file access.

### Changed

- Raised the supported operating-system guidance to macOS 26+, made Apple Container 1.4.1 the September 2026 baseline for untrusted OCI inputs, and required comparison of the client, service, and current signed release.
- Updated Container Machine selection for 1.3+ so agents first verify `/sbin/init` and can use current standard images directly, while retaining derived OpenRC/systemd recipes for older or service-oriented workloads.
- Updated registry guidance for the removal of `--scheme auto`, documented default HTTPS, and made installed command help authoritative when generated references lag the parser.

### Fixed

- Corrected cleanup, Kubernetes lifecycle, and nested-command help examples against the signed and notarized 1.4.1 release payload without replacing the host runtime.

## devcontainer-helper 1.1.0 - 2026-09-20

### Added

- Added Dev Container CLI 0.89.0 OCI authentication hardening guidance for bearer realms, registry credential forwarding, token redirects, and exact reviewed cross-origin authentication-host mappings.
- Added hardened configuration/build validation and reporting requirements for externally hosted OCI Features, Templates, and registry metadata.

### Changed

- Added explicit WSL Containers Public Preview version floors of WSL 2.9.3+ and Dev Container CLI 0.88.0+, with target-specific validation instead of implied Docker or Compose parity.
- Documented the Dev Container CLI version boundaries for stable lockfiles, WSL Containers support, and OCI authentication hardening.

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
