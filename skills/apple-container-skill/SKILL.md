---
name: apple-container-skill
description: Use Apple's `container` CLI on Apple silicon macOS for Linux containers, OCI image builds, registries, volumes, networks, port forwarding, host access, persistent `container machine` Linux environments, and experimental local Kubernetes clusters. Use this skill whenever the user asks to replace Docker Desktop with Apple Container, run Linux commands on macOS, build/run/inspect Apple containers, debug Apple Container service/network/build failures, use Container Machines, or use `container k8s`.
metadata:
  version: "1.2.0"
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
container system version
```

- Require Apple silicon (`arm64`) and macOS 26+ for supported workflows. Apple does not support older macOS releases; do not present macOS 15 workarounds as supported operation.
- Record the CLI and service versions, compare them with the current signed release, and make sure they match before real work. As of September 2026, 1.4.1 is the security baseline for untrusted images, image archives, registries, or container identifiers; 1.3.1 and 1.4.1 fixed path traversal, host-file access, credential handling, and related OCI defects. Upgrade before inventing workarounds for defects already fixed upstream.
- If the CLI is missing, prefer Apple's signed installer from the GitHub releases page. Homebrew can work, but if `container system start` fails with missing plugins after a Homebrew install, upgrade/reinstall the formula.
- Start services with `container system start` when status shows they are stopped. First start may prompt to install the recommended Linux kernel.
- Treat installed `container <command> --help` as the authoritative command surface. Release summaries and even generated command references can lag the shipped parser; do not infer Docker subcommands or flags.
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
- Use experimental `container k8s` only for a disposable local single-node Kubernetes cluster. Do not present it as a production or multi-node Kubernetes runtime, and warn that it writes or updates kubeconfig entries.
- Do not describe machines as merely "persistent containers." A machine is a convenience wrapper around a container, a separate persistent root disk, and host integration. It maps the host user, forwards SSH agent support, and mounts the macOS home at `/Users/<user>` while the Linux user's `$HOME` is `/home/<user>`.
- Current Container Machine images need `/sbin/init`. Apple Container 1.3 relaxed machine path restrictions and current Apple guidance uses `alpine:latest` directly; on current releases, try a requested image that contains `/sbin/init` before deriving a custom image. Build an OpenRC- or systemd-capable image when init is absent or the workflow needs managed system services.
- For scripted machine commands, prefer an option terminator: `container machine run -n dev -- whoami` or `container machine run -n dev -- /bin/sh -c 'whoami; pwd; echo "$HOME"'`. Avoid `-i` in heredoc/non-interactive scripts because it can consume the rest of the script from stdin.

## Machine Image Selection

When the user names a distro image, preserve the distro choice but choose the runtime shape correctly:

- For one-shot commands or app containers, use the requested image directly with `container run`.
- For `container machine`, check that the requested image contains `/sbin/init`. On Apple Container 1.3+, use a standard image directly when it satisfies that contract; Apple's current quickstart uses `alpine:latest`.
- If `/sbin/init` is absent, or the user needs systemd-managed services, explain the requirement and derive a machine image from the requested base instead of silently switching distros.
- For Alpine machines, install both `openrc` and `openrc-init`, add related user/network tools, set `CMD ["/sbin/openrc-init"]`, then build a local `*-machine` image. Installing only `openrc` and using BusyBox `/sbin/init` can start and immediately shut down.
- For Ubuntu/Debian machines, add systemd, dbus, sudo, SSH/network tools as needed, set the systemd target, and build a local `*-machine` image.
- On Apple Container 1.2 or older, upgrade before turning missing OpenRC, masked-path, or read-only-path failures into a permanent custom-image workaround.

## Safety Rules

Ask before:

- Running `sudo`, installing, upgrading, uninstalling, or changing DNS resolver entries.
- Global cleanup: `container prune`, `container image prune`, `container volume prune`, `container network prune`, or deleting all resources.
- Deleting named machines, volumes, images, or containers that were not created for the current task.
- Editing `~/.ssh/config`, changing host firewall/VPN settings, or widening bind mounts beyond the project directory.
- Passing kernel arguments that disable or weaken security controls. Use `--kernel-arg` only for a documented kernel-level requirement, not ordinary application configuration.
- Passing `NONE` to `--masked-path` or `--read-only-path`, because it clears runtime security defaults rather than adding a restriction.

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
container machine create docker.io/library/alpine:latest --name dev --set-default --cpus 4 --memory 8G
# Run the first command from a real terminal so initial user setup has a host PTY.
container machine run -n dev -- /bin/sh -c 'whoami; pwd; echo "$HOME"'
container machine stop dev
```

## Important Current Behaviors

- `container system property get`, `set`, and `clear` were removed in 1.0. Use `~/.config/container/config.toml` for defaults and `container system property list` only to inspect effective config.
- Apple's signed installer places the CLI at `/usr/local/bin/container`; check that path directly when a fresh shell cannot find `container`.
- Apple Container 1.3 removed the registry `--scheme auto` value. Current releases accept only `https` (the default) or an explicit `http`; use HTTP only for a deliberately trusted local registry.
- Apple Container 1.3.1 and 1.4.1 include security fixes for crafted identifiers, image layers/layouts, registry authentication, and host-file access. Do not use an older runtime for untrusted OCI inputs merely because its basic smoke test passes.
- `container build` may leave the BuildKit builder running. If a validation task must leave no runtime processes, inspect `container builder status`, then use `container builder stop` and `container builder delete`.
- Apple Container 1.2.1 added `container build --ssh default`; use it for private build dependencies instead of copying SSH keys into the build context or image.
- Host-to-container traffic should usually use `-p/--publish`; if it fails, check that the app listens on `0.0.0.0` inside the container.
- For Unix sockets, choose by direction: bind-mount (`-v`) a socket that already exists on the host into the container; use `--publish-socket host_path:container_path` when the process in the container creates the socket and the host must reach it. For non-root clients, verify ownership and mode on both endpoints. Apple Container 1.1 fixed non-root socket-mount access.
- Apple Container 1.1 also fixed relative local paths for `container cp`; on older versions, use absolute paths or upgrade rather than debugging a correct relative path.
- Apple Container 1.2 prevents an untrusted image's bare `ENV` entry from implicitly copying a same-named host variable. Still make inheritance explicit: use `-e NAME` only when host passthrough is intended, and prefer `KEY=value`, an env file, or a secret mechanism for reproducible runs.
- Use repeatable `--kernel-arg key=value` only for a kernel/security/debug requirement and verify the effective command line with `cat /proc/cmdline`. Do not use it for application settings or casually replace security defaults such as `lsm=landlock`.
- The 1.4.1 release does not expose `container run --stop-signal`. Put `STOPSIGNAL` in the image for a reusable default or use `container stop -s SIGNAL` for an operator-selected signal.
- `--masked-path` and `--read-only-path` are experimental additive isolation controls on `run` and `create`. Verify them with the installed help, prefer adding paths, and never clear the runtime defaults with `NONE` without explicit approval.
- `container clean <running-container...>` reclaims unused filesystem space from each container root filesystem and its named volume mounts. It is scoped, requires running containers, and is not a substitute for global prune commands.
- `container system status` gained additional host, client, path, and resource fields in 1.4.1. Consume structured output by field name and tolerate additive fields rather than depending on the old shape.
- Treat named volumes as single-attachment unless the workflow has proven otherwise; do not assume the same named volume can be attached concurrently to multiple running containers.
- Container-to-host traffic does not use Docker's magic host alias. Configure a localhost DNS domain:

```bash
sudo container system dns create host.container.internal --localhost 203.0.113.113
```

This can disable Private Relay, and packet-filter rules may need recreation after reboot.

- `container network` user-defined networks require macOS 26+. Container name resolution currently works only on the default network; use inspected IPs on custom networks rather than promising Docker-style service discovery.
- There is no `container compose`. Translate a simple trusted stack into explicit build/run/readiness/teardown commands, or keep a Compose-capable runtime when Compose semantics are required.
- If networking worked and then fails after VPN or endpoint security changes, suspect vmnet/VPN routing before changing application code.
- A machine's first command may need a real host terminal while user setup completes. If a headless first run fails with `Operation not supported by device`, retry the initialization from a PTY; subsequent non-interactive `machine run ... -- command` calls can be scripted. Do not add `-i` to a heredoc or unattended job.

## References

- Read [references/workflows.md](references/workflows.md) for common development, build, network, registry, volume, machine, filesystem-reclamation, and experimental Kubernetes playbooks.
- Read [references/troubleshooting.md](references/troubleshooting.md) when service startup, DNS, VPN, vmnet, builder, Rosetta, port publishing, or machine mode fails.
- Read [references/commands.md](references/commands.md) for concise command coverage after you know which workflow you need.
