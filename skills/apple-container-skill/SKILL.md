---
name: apple-container-skill
description: Use Apple's `container` CLI on Apple silicon macOS for Linux containers, OCI image builds, registries, volumes, networks, port forwarding, host access, and persistent `container machine` Linux environments. Use this skill whenever the user asks to replace Docker Desktop with Apple Container, run Linux commands on macOS, build/run/inspect Apple containers, debug Apple Container service/network/build failures, or use Container Machines.
---

# Apple Container Skill

Operate Apple's `container` CLI as a native macOS Linux container runtime. This skill should guide the agent's choices, not just provide command syntax.

## First Moves

Before doing real work, establish whether the host and runtime are usable:

```bash
sw_vers
uname -m
command -v container
container --version
container system status
```

- Require Apple silicon (`arm64`). Current Apple docs support macOS 26+ for real use; macOS 15 has important networking limitations.
- If the CLI is missing, prefer Apple's signed installer from the GitHub releases page. Homebrew can work, but if `container system start` fails with missing plugins after a Homebrew install, upgrade/reinstall the formula.
- Start services with `container system start` when status shows they are stopped. First start may prompt to install the recommended Linux kernel.
- Run a smoke test before blaming application code:

```bash
container run --rm docker.io/library/alpine:latest sh -lc 'uname -a; nslookup github.com'
```

For an unknown or flaky environment, run the bundled diagnostic:

```bash
bash skills/apple-container-skill/scripts/diagnose.sh
```

## Choose The Right Runtime Shape

- Use `container run` for disposable app containers, one-shot Linux commands, project dev shells, image smoke tests, and services whose state should live in bind mounts or named volumes.
- Use `container machine` for a long-lived Linux workspace: repeated distro testing, system services, VS Code Remote SSH, a persistent root filesystem, or "edit on macOS, build inside Linux" loops.
- Do not describe machines as merely "persistent containers." A machine is a convenience wrapper around a container, a separate persistent root disk, and host integration. It maps the host user, forwards SSH agent support, and mounts the macOS home at `/Users/<user>` while the Linux user's `$HOME` is `/home/<user>`.
- Plain OCI application images may fail in machine mode because machines need a bootable init system. Even `alpine:3.22` can create, inspect, and stop but fail command execution if `/sbin/openrc` is absent. Prefer an image known to be bootable as a machine, or build a systemd/openrc-capable machine image.

## Safety Rules

Ask before:

- Running `sudo`, installing, upgrading, uninstalling, or changing DNS resolver entries.
- Global cleanup: `container prune`, `container image prune`, `container volume prune`, `container network prune`, or deleting all resources.
- Deleting named machines, volumes, images, or containers that were not created for the current task.
- Editing `~/.ssh/config`, changing host firewall/VPN settings, or widening bind mounts beyond the project directory.

Prefer graceful stops (`container stop`, `container machine stop`) before forceful deletion or `container kill`.

## Practical Defaults

Common project shell:

```bash
container run --rm -it -v "$PWD:/work" -w /work docker.io/library/ubuntu:24.04 bash
```

Build and run an image:

```bash
container build -t local/app:dev .
container run --rm -p 8080:8080 local/app:dev
```

Long-lived machine:

```bash
container machine create <bootable-machine-image> --name dev --set-default --cpus 4 --memory 8G
container machine run
container machine stop dev
```

## Important Current Behaviors

- `container system property get`, `set`, and `clear` were removed in 1.0. Use `~/.config/container/config.toml` for defaults and `container system property list` only to inspect effective config.
- Apple's signed installer places the CLI at `/usr/local/bin/container`; check that path directly when a fresh shell cannot find `container`.
- `container build` may leave the BuildKit builder running. If a validation task must leave no runtime processes, inspect `container builder status`, then use `container builder stop` and `container builder delete`.
- Host-to-container traffic should usually use `-p/--publish`; if it fails, check that the app listens on `0.0.0.0` inside the container.
- Treat named volumes as single-attachment unless the workflow has proven otherwise; do not assume the same named volume can be attached concurrently to multiple running containers.
- Container-to-host traffic does not use Docker's magic host alias. Configure a localhost DNS domain:

```bash
sudo container system dns create host.container.internal --localhost 203.0.113.113
```

This can disable Private Relay, and packet-filter rules may need recreation after reboot.

- `container network` user-defined networks require macOS 26+. On macOS 15, container-to-container networking and multiple networks are limited.
- If networking worked and then fails after VPN or endpoint security changes, suspect vmnet/VPN routing before changing application code.

## References

- Read [references/workflows.md](references/workflows.md) for common development, build, network, registry, volume, and machine playbooks.
- Read [references/troubleshooting.md](references/troubleshooting.md) when service startup, DNS, VPN, vmnet, builder, Rosetta, port publishing, or machine mode fails.
- Read [references/commands.md](references/commands.md) for concise command coverage after you know which workflow you need.
