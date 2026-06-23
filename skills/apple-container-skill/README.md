# Apple Container Skill

This repository contains the `apple-container-skill` Agent Skill. It guides agents using Apple's `container` CLI on Apple silicon macOS, including ordinary containers, OCI image builds, networking, volumes, registries, and persistent Container Machines.

It complies with the [Agent Skills specification](https://agentskills.io/specification).

## Usage

Import `SKILL.md` into an agent's skill configuration.

## Features

- **Operational Playbooks**: Host readiness checks, smoke tests, safe cleanup rules, and workflow selection.
- **Container Machines**: Persistent Linux environments with host user/home integration and machine-specific troubleshooting.
- **Container Runtime Workflows**: Disposable dev shells, bind mounts, port forwarding, image builds, registries, volumes, and networks.
- **Current Configuration Model**: `~/.config/container/config.toml` guidance instead of removed mutable system property commands.
- **Diagnostics**: A read-only shell helper for collecting host, service, network, and log context.

## Runtime Validation Notes

This skill was runtime-validated on macOS 26.5 arm64 with Apple Container 1.0.0 installed from the signed GitHub package.

Observed during validation:

- The signed installer places the CLI at `/usr/local/bin/container`; agents should check that absolute path when `container` is not on `PATH`.
- First service startup can install the recommended kernel when run with `container system start --enable-kernel-install`.
- `container build` starts a BuildKit builder container; stop/delete the builder when a validation task must leave no runtime processes.
- Host port publishing worked on the default network and on a custom network after confirming the app listened on `0.0.0.0`.
- Named volumes should be treated as single-attachment unless proven otherwise; do not rely on concurrently attaching one volume to multiple running containers.
- Plain `alpine:3.22` could be created as a machine, inspected, logged, stopped, and deleted, but command execution was not reliable and logs reported missing `/sbin/openrc`. A minimal Alpine machine image with `openrc` installed did validate successfully.
- In scripted machine tests, prefer `container machine run -n <name> -- <command>` or a shell wrapper such as `-- /bin/sh -c 'whoami; pwd; echo "$HOME"'`. Avoid `-i` in heredoc-driven scripts because it can consume the rest of the script from stdin.
