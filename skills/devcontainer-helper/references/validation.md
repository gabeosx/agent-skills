# Dev Container Validation

Validate the actual configuration and its intended runtime behavior. Do not report success from JSON parsing alone.

## 1. Static Checks

1. Confirm there are no unresolved template sentinels:

   ```bash
   rg '__[A-Z0-9_]+__' .devcontainer .devcontainer.json
   ```

2. Parse JSON/JSONC with an appropriate parser.
3. Confirm referenced Dockerfiles, Compose files, scripts, and workspace paths exist.
4. Confirm Feature identifiers and options against their current documentation.
5. Inspect the resolved configuration:

   ```bash
   devcontainer read-configuration --workspace-folder .
   ```

`read-configuration` may warn when it cannot extract image metadata from a new registry manifest shape even though the registry and builder can consume the image. Record the warning, inspect the registry manifest, and run the build; do not equate a metadata warning with either build success or build failure.

If the CLI is not installed globally, use a temporary invocation of the current `@devcontainers/cli` package rather than permanently changing the host merely to validate.

## 2. Build And Lockfile Checks

Build once to resolve Features and generate or refresh the lockfile:

```bash
devcontainer build --workspace-folder .
```

Then verify reproducibility:

```bash
devcontainer build --workspace-folder . --frozen-lockfile
```

Confirm that:

- The expected adjacent lockfile exists and is tracked.
- It contains every configured Feature, resolved version, digest, and integrity data.
- A frozen build does not modify it.
- The base image is independently pinned to the intended explicit distro or project policy.

Use `devcontainer outdated --workspace-folder .` to report available Feature updates. Run `devcontainer upgrade` only when the user requested updates or the task includes maintenance; review the resulting diff.

## 3. Runtime Smoke Test

Start the environment:

```bash
devcontainer up --workspace-folder .
devcontainer exec --workspace-folder . sh -lc 'id; pwd; uname -a'
```

Then verify what the project needs, such as:

- The intended remote user and workspace ownership.
- Language and package-manager versions.
- Project dependency installation.
- Sidecar DNS names, readiness, and persistence.
- Forwarded service binding.
- Required architecture.
- Lifecycle scripts and their idempotence.

Do not print environment variables or secret values as a generic smoke test.

## 4. Target-Specific Checks

- **Compose:** validate the fully merged model with `docker compose config`; test service health and primary-service startup.
- **Codespaces:** verify prebuild placement, port visibility, secret availability, machine requirements, mount assumptions, and organization policy. Do not claim local Docker success proves Codespaces behavior.
- **Podman:** validate the requested socket, Compose implementation, UID mapping, and Feature behavior with Podman itself.
- **WSL Containers:** consult current preview limitations, then exercise the actual required flags, mounts, and networking. Do not infer support from Docker-only testing.
- **Multi-architecture images:** build on native target runners when possible and inspect the published manifest for every promised architecture.

State any target that was not exercised and the exact reason.

## 5. Cleanup And Evidence

Record the containers, networks, and volumes created by the test before removing them. Use project labels, Compose project names, or captured resource IDs to target only test-created resources.

The Dev Container CLI does not provide a general `down` command. Use the selected runtime or Compose project to stop and remove the test environment. Never use global prune commands for validation.

Finish by reporting:

- Commands attempted and pass/fail status.
- Relevant diagnostics for failures or skips.
- Lockfile creation and frozen-build results.
- Runtime targets exercised.
- IDs or names of test resources removed.
- A final runtime listing or label-filtered query showing no test containers remain.
