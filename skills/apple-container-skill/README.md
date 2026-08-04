# Apple Container Skill

This repository contains the `apple-container-skill` Agent Skill. It guides agents using Apple's `container` CLI on Apple silicon macOS, including ordinary containers, OCI image builds, networking, volumes, registries, and persistent Container Machines.

It complies with the [Agent Skills specification](https://agentskills.io/specification).

## Usage

Import `SKILL.md` into an agent's skill configuration.

## Features

- **Operational Playbooks**: Host readiness checks, smoke tests, safe cleanup rules, and workflow selection.
- **Container Machines**: Persistent Linux environments with host user/home integration and machine-specific troubleshooting.
- **Container Runtime Workflows**: Disposable dev shells, bind mounts, port forwarding, image builds, registries, volumes, and networks.
- **Release-Aware Decisions**: Known fixed-defect routing for 1.1 and 1.2, with guidance to upgrade before inventing permanent workarounds.
- **Security And Integration Guidance**: Intentional environment inheritance, directional Unix socket handling, and justified kernel-argument use.
- **Current Configuration Model**: `~/.config/container/config.toml` guidance instead of removed mutable system property commands.
- **Diagnostics**: A read-only shell helper for collecting host, service, network, and log context.

## Runtime Validation Notes

Version 1.1.0 of this skill was validated on macOS 26.5 arm64 against the signed and notarized Apple Container 1.2.0 release payload. The payload was staged under an isolated app/install/log root so it did not replace the host's installed 1.0.0 runtime. Release claims were checked against Apple's [release history](https://github.com/apple/container/releases), current command help, and targeted live experiments.

Observed during validation:

- Basic image pull, DNS, and arm64 execution passed.
- Relative-path `container cp` passed in both directions.
- A non-root container process reached a host-created Unix socket through `-v`; a host process reached a container-created socket through `--publish-socket`. This established why the two mechanisms are not interchangeable.
- A custom `--kernel-arg` appeared in `/proc/cmdline`; duplicate defaults remained possible, so the guidance requires verification instead of assuming replacement.
- A harmless host environment sentinel did not enter an ordinary container and did enter only with explicit `-e NAME` passthrough.
- TCP publishing passed after first proving the service was healthy and listening on `0.0.0.0` inside the container. An intentionally broken service fixture demonstrated why that diagnostic order matters.
- Plain `alpine:3.22` failed machine execution with missing `/sbin/openrc`. The prior `openrc` plus `/sbin/init` recipe started and immediately shut down. Installing `openrc-init` and using `/sbin/openrc-init` produced a persistent machine.
- The first machine command required a host PTY for user initialization; the same machine then accepted non-interactive commands without `-i`.
- Shipped 1.2.0 help exposed `--kernel-arg` but not the release-note-only `run --stop-signal`, so the skill routes shutdown configuration to image `STOPSIGNAL` or `container stop -s`.
- All named containers, machines, images, builder state, sockets, and isolated service state created for validation were removed after the test run.
