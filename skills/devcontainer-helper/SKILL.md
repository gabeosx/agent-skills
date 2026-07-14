---
name: devcontainer-helper
description: Design, create, audit, update, troubleshoot, or optimize Dev Container and GitHub Codespaces environments, including devcontainer.json, Dockerfiles, Compose sidecars, Features, lockfiles, prebuilds, runtime compatibility, and related CI. Use when an agent must choose a development-container architecture, not merely recall configuration syntax.
metadata:
  version: "1.0.0"
---

# DevContainer Helper

Design a development environment that is reproducible, maintainable, secure, and appropriate for every target runtime. Guide the architecture; do not merely emit `devcontainer.json` properties.

## First Moves

Inspect before editing or asking questions:

1. Read repository and nested agent instructions.
2. Find existing `.devcontainer.json`, `.devcontainer/`, Dockerfiles, Compose files, CI workflows, language manifests, lockfiles, version-manager files, and documented ports.
3. Identify target surfaces: local Docker, Podman, GitHub Codespaces, CI/prebuilds, or preview WSL Containers.
4. Determine required languages, versions, services, architectures, extensions, secrets, ports, and persistence.
5. Preserve the existing distro, user model, and working environment unless the user requests a migration or evidence makes one necessary. Never silently upgrade an OS major.

Prefer repository evidence over generic defaults. Ask only for choices that inspection cannot resolve and that materially change the result.

## Resolve Current Inputs

Treat image tags, Features, release status, and runtime support as time-sensitive.

- For a greenfield generic Ubuntu environment, verify the newest Ubuntu release marked LTS using an official Ubuntu source, then confirm through the registry manifest or an actual pull/build that an explicit `mcr.microsoft.com/devcontainers/base:ubuntuYY.MM` variant is published for every required architecture. Emit that explicit tag; never emit floating `:ubuntu` or `:latest`.
- If current official information is unavailable, preserve a repository-pinned choice or report that the selection cannot be verified. Do not guess the current LTS.
- Resolve Features from the official index at <https://containers.dev/features> and open the selected Feature's documentation before using it. Use the major reference recommended by the current documentation and let the lockfile capture the exact version and digest.
- Vet third-party Features for publisher identity, source code, release recency, supported architectures, privilege requirements, and install behavior. Prefer official Features or a Dockerfile when trust or maintenance is unclear.
- Do not invent an official Playwright Feature. Prefer a version-matched official Playwright image or the project's Playwright package with `playwright install --with-deps`.
- When using the official Node Feature, prefer its supported pnpm option over adding a redundant standalone pnpm Feature.

Read [references/decision-guide.md](references/decision-guide.md) for the source-selection and architecture playbooks.

## Choose The Environment Shape

- Use an **image** when a maintained image already matches the project and no meaningful OS customization is required.
- Use a **Dockerfile** for OS packages, certificates, native libraries, globally baked tools, or other reproducible image-layer changes.
- Use **Docker Compose** when the development environment needs databases, caches, brokers, emulators, or multiple cooperating services. The primary service may still use an image or Dockerfile.
- Use **Features** for trusted, modular developer tooling whose configuration and update lifecycle are better than hand-written installation steps.

Prefer sidecars for supporting services. Do not install a database, cache, broker, or test dependency inside the development container merely for convenience.

For workloads that themselves require containers:

1. Prefer explicit Compose sidecars when the required services are known.
2. Consider host-daemon access only for a trusted local workflow that genuinely needs arbitrary Docker commands; explain that the socket is effectively host-root authority and is not portable to every runtime.
3. Use Docker-in-Docker only when an isolated nested daemon is a real requirement, such as testing Docker behavior or creating a disposable container engine. Document its privilege, storage, cache, and performance costs.

Do not add mounts, capabilities, `privileged`, Docker socket access, extensions, or forwarded ports without a demonstrated need.

## Make It Reproducible

- Bake stable OS dependencies and global tools into an image layer. Keep repository dependency installation tied to the repository lockfile.
- Allow `devcontainer build` or `devcontainer up` to generate the Feature lockfile and commit it. For the usual `.devcontainer/devcontainer.json`, this is `.devcontainer/devcontainer-lock.json`; a root `.devcontainer.json` uses `.devcontainer-lock.json`.
- Use `--frozen-lockfile` in CI after the lockfile exists. A Feature lockfile does not pin the base image, so keep the base image's distro choice explicit.
- An explicit distro tag prevents silent OS-major drift but can still receive patched image contents. If policy requires hermetic inputs, pin the image digest and automate reviewed updates; otherwise document that patch refreshes are intentional.
- Configure Dependabot's `devcontainers` ecosystem when Features are present. Dependabot updates Feature references and their lockfile; a runtime option such as a Node version does not enable Dependabot by itself.
- Use prebuilt images when image construction is expensive or many developers repeatedly build the same environment. When publishing for amd64 and arm64, use native matrix builds and merge the manifests rather than assuming emulation is acceptable.

## Place Lifecycle Work Deliberately

Use the earliest lifecycle that has the required inputs:

- `initializeCommand`: host-side preparation before creation; keep it portable and avoid host mutation unless required.
- `onCreateCommand`: deterministic first-creation work. Codespaces prebuilds can capture it.
- `updateContentCommand`: deterministic work that must rerun when repository content changes. Codespaces prebuilds can capture it.
- `postCreateCommand`: per-instance initialization, secrets-dependent setup, permissions, or migrations that should not be baked into a prebuild.
- `postStartCommand`: cheap work required after every start.
- `postAttachCommand`: interactive client-session work only.

Object-form lifecycle commands run in parallel. Use an ordered shell command or script when steps depend on one another. Do not hide large, fragile setup programs inside JSON strings; call a version-controlled repository script instead.

## Protect Security And Portability

- Prefer a non-root `remoteUser`; preserve image-specific user conventions and use `updateRemoteUserUID` only when the runtime supports the intended behavior.
- Declare recommended secret names and descriptions with `secrets`, but never store secret values in the configuration, image, build arguments, or committed environment files.
- Use `hostRequirements` when CPU, memory, storage, or GPU capacity is a real prerequisite.
- Treat bind mounts, host paths, Docker sockets, `localEnv`, and port behavior as runtime-specific. Codespaces ignores most bind mounts and does not behave like a developer's local host.
- Treat Podman and WSL Containers as explicit compatibility targets that require validation. WSL Containers remains a preview path until official documentation says otherwise; do not promise full Docker or Compose parity.
- Keep Codespaces-only behavior under `customizations.codespaces` and editor behavior under the appropriate tool customization.

Read [references/configuration.md](references/configuration.md) for modern configuration shapes and Codespaces caveats.

## Implement And Validate

1. For an image-based environment, start from [assets/devcontainer-template.json](assets/devcontainer-template.json) only after choosing the architecture. For Dockerfile or Compose environments, generate the corresponding modern shape from the configuration reference.
2. Replace every `__UPPER_SNAKE_CASE__` sentinel. Do not deliver a configuration containing unresolved sentinels.
3. Use modern `build.dockerfile` and `build.context`; do not introduce legacy top-level `dockerFile` or `context` properties.
4. Read the resolved configuration, build it, confirm lockfile behavior, start a smoke-test container when practical, and execute a command as the intended remote user.
5. Test each declared target runtime or state clearly which targets were not exercised and why.
6. Remove only containers, networks, volumes, or temporary files created by validation. Never perform global cleanup.

Follow [references/validation.md](references/validation.md) for commands, failure handling, and cleanup evidence.

## Report The Result

Include:

- The chosen image/Dockerfile/Compose shape and why it fits.
- The official sources used to resolve time-sensitive images and Features.
- Lifecycle and prebuild decisions.
- Security and portability tradeoffs, including Docker access if present.
- Lockfile and update automation behavior.
- Validation performed, failures or untested targets, and cleanup evidence.
