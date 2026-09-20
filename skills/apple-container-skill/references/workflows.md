# Apple Container Workflows

Use this file when the user asks "how should I do X with Apple Container?" Prefer these workflows over raw command guessing.

## Install Or Upgrade

1. Verify host eligibility:
   ```bash
   sw_vers
   uname -m
   ```
   Apple silicon (`arm64`) is required. Treat macOS 26+ as the supported target; older macOS releases are unsupported.

2. Install:
   - Preferred documented path: download Apple's signed installer package from the `apple/container` GitHub releases page and install it.
   - Homebrew can be used when the user prefers it:
     ```bash
     brew install container
     ```

3. Start and verify:
   ```bash
   container system start
   container system status
   container --version
   container system version
   ```

   Compare the CLI and running service versions with the current signed release. Upgrade before working around defects fixed upstream. Version 1.3 removed registry `--scheme auto` and relaxed machine path restrictions. Versions 1.3.1 and 1.4.1 fixed path traversal, host-file access, registry credential handling, crafted image/layout, and unchecked-identifier defects. As of September 2026, use 1.4.1 or newer for untrusted OCI inputs.

4. Upgrade:
   ```bash
   container system stop
   /usr/local/bin/update-container.sh
   container system start
   ```

5. Uninstall only when asked:
   ```bash
   /usr/local/bin/uninstall-container.sh -k
   /usr/local/bin/uninstall-container.sh -d
   ```

Ask before privileged installer, DNS, update, or uninstall steps.

## Disposable Linux Shell

Use ordinary containers for throwaway Linux commands and isolated project shells:

```bash
container run --rm -it \
  -v "$PWD:/work" \
  -w /work \
  docker.io/library/ubuntu:24.04 \
  bash
```

For one-shot checks:

```bash
container run --rm -v "$PWD:/work" -w /work docker.io/library/alpine:latest sh -lc 'uname -a; ls -la'
```

Use `--ssh` for private Git access instead of copying keys:

```bash
container run --rm -it --ssh -v "$PWD:/work" -w /work docker.io/library/ubuntu:24.04 bash
```

Treat environment inheritance as an explicit decision:

```bash
# Reproducible value; preferred when the value is not secret.
container run --rm -e APP_ENV=development local/app:dev

# Intentional host passthrough; use only when that coupling is desired.
container run --rm -e SSH_AUTH_SOCK local/app:dev
```

Apple Container 1.2 stops a bare environment name embedded in an image from silently reading the host value. Explicit `-e NAME` and bare names in an env file still request host passthrough. Use a secrets facility instead of command-line values for credentials.

## Build And Run An Image

```bash
container build --progress plain -t local/app:dev .
container run --rm -p 8080:8080 local/app:dev
```

For resource-heavy builds, tune the builder before building:

```bash
container builder stop
container builder delete
container builder start --cpus 8 --memory 16G
```

If the project has both `Dockerfile` and `Containerfile`, pass `-f` explicitly. Use `--secret` for build secrets rather than putting tokens in Dockerfile layers. For a private Git dependency, forward the agent rather than copying a private key into the context:

```bash
container build --ssh default -t local/app:dev .
```

`container build` starts a BuildKit builder container. For normal development, leave it alone. For validation tasks that must leave no runtime processes, finish with:

```bash
container builder stop
container builder delete
```

## Long-Running Service

```bash
container run -d --name app -p 127.0.0.1:3000:3000 -v "$PWD:/work" -w /work local/app:dev
container logs -f app
curl http://127.0.0.1:3000
container stop app
container delete app
```

If the port mapping fails, first check that the application listens on `0.0.0.0` inside the container, not only `127.0.0.1`.

For shutdown behavior, put `STOPSIGNAL` in the Dockerfile when every deployment of the image needs the same signal. For a one-off operator choice, use `container stop -s SIGNAL app`. Do not suggest `container run --stop-signal`; the released 1.4.1 CLI does not expose that option.

Add experimental path isolation only when the installed help exposes it:

```bash
container run --rm \
  --masked-path /proc/acpi \
  --read-only-path /proc/bus \
  docker.io/library/alpine:latest true
```

These flags add restrictions. The special value `NONE` clears the runtime's defaults, so require explicit approval before using it.

## Unix Socket Integration

Choose the mechanism from the direction in which the socket is created:

- Host creates the socket, container connects: bind-mount the existing socket with `-v`.
- Container creates the socket, host connects: publish it with `--publish-socket`.

Host-created socket:

```bash
container run --rm \
  -v /absolute/host/service.sock:/run/service.sock \
  local/client:dev
```

Container-created socket:

```bash
container run --rm \
  --publish-socket /absolute/host/service.sock:/run/service.sock \
  local/server:dev
```

Use absolute host paths and verify the socket exists on the creating side before testing the client. When either side is non-root, inspect numeric UID/GID and mode on both paths; Apple Container 1.1 fixed a runtime defect that otherwise blocked non-root access to mounted sockets.

## Volumes

Use bind mounts for project source and named volumes for caches or service data:

```bash
container volume create node-cache
container run --rm -it \
  -v "$PWD:/work" \
  --mount type=volume,source=node-cache,target=/root/.npm \
  -w /work \
  local/project-dev:latest
```

Anonymous volumes are not automatically removed by `--rm`; clean them manually when they are no longer needed.

Treat named volumes as single-attachment unless tested for the specific workload. Avoid attaching the same named volume to multiple running containers during diagnostics; use separate volumes when comparing default-network and custom-network behavior.

For database images, avoid initializing directly at a new volume root if the service dislikes `lost+found`. Prefer a subdirectory such as `PGDATA=/var/lib/postgresql/data/pgdata`.

## Networks And DNS

Create custom networks for isolation or subnet conflicts on macOS 26+:

```bash
container network create --subnet 192.168.105.0/24 devnet
container run --rm --network devnet docker.io/library/alpine:latest sh -lc 'ip route; nslookup github.com'
container network inspect devnet
```

Configure host-side container name resolution:

```bash
sudo container system dns create test
```

Then set the default DNS domain in `~/.config/container/config.toml`:

```toml
[dns]
domain = "test"
```

Restart after config edits:

```bash
container system stop
container system start
```

## Access Host Services From Containers

Do not assume Docker's host alias works. Configure a localhost domain:

```bash
sudo container system dns create host.container.internal --localhost 203.0.113.113
container run --rm alpine/curl curl http://host.container.internal:8000
```

Choose an address unlikely to collide, such as a documentation range address (`192.0.2.0/24`, `198.51.100.0/24`, or `203.0.113.0/24`) or an unused private range. The host service must be reachable on the host loopback. This feature can disable Private Relay, and packet-filter rules may need recreation after restart.

## Registry Auth And Image Transfer

```bash
container registry login ghcr.io
container build -t ghcr.io/OWNER/IMAGE:tag .
container image push ghcr.io/OWNER/IMAGE:tag
container image save -o image.tar ghcr.io/OWNER/IMAGE:tag
container image load -i image.tar
```

Use `--password-stdin` or interactive login for secrets. Do not put tokens directly in shell history.

HTTPS is the registry default. Current releases accept only `--scheme https` or `--scheme http`; the latter is appropriate only for a deliberately trusted local registry. Do not carry forward old `--scheme auto` examples.

## Persistent Container Machines

Use machines when the user wants a reusable Linux workspace rather than a single application container.

```bash
container machine create docker.io/library/alpine:latest --name dev --set-default --cpus 4 --memory 8G --home-mount rw
container machine run -n dev -- uname -a
container machine run -n dev -- /bin/sh -c 'whoami; pwd; echo "$HOME"'
container machine stop dev
```

Operational rules:

- `container machine run` boots the machine if needed.
- `container machine set` changes boot config on disk; stop and restart for changes to take effect.
- `container machine rm` deletes the machine and its persistent root filesystem.
- Use `home-mount=ro` when read access to host files is enough.
- Use `home-mount=none` for stronger isolation from host home files.
- Machine names must start/end with a lowercase letter or digit and use lowercase letters, digits, and hyphens.

Path model:

- The Linux user's `$HOME` is `/home/<user>`.
- The macOS home is mounted at `/Users/<user>` when home mounting is enabled.
- If host `$PWD` is under the mounted home, `container machine run` may start in that same `/Users/<user>/...` path.

Machine images:

- A machine image must contain `/sbin/init`. On Apple Container 1.3+, first try the requested standard image when it satisfies that contract; Apple's current quickstart uses `alpine:latest` directly.
- On 1.2-era runtimes, plain Alpine could fail with missing `/sbin/openrc`, and runtime path restrictions could force a custom image. Upgrade before preserving that workaround on current releases.
- When `/sbin/init` is absent, or the workflow needs managed system services, derive a machine-capable image from the requested distro rather than silently switching distributions.
- For Alpine service workflows, one reliable derived image uses OpenRC:
  ```dockerfile
  FROM docker.io/library/alpine:3.22
  RUN apk add --no-cache openrc openrc-init shadow sudo bash busybox-extras iproute2 curl coreutils
  RUN rc-update add local default || true
  CMD ["/sbin/openrc-init"]
  ```
- For Ubuntu/Debian, build an image that includes `/sbin/init`, systemd, and required service setup.
- Name derived images clearly, for example `local/alpine-machine:3.22` or `local/ubuntu-machine:24.04`, so agents do not confuse them with upstream app images.

Command invocation:

- Run the first machine command from a real host terminal. Initial user provisioning can require a PTY; a first command launched from a headless runner may fail with `Operation not supported by device`. Once initialization succeeds, ordinary non-interactive commands work without `-i`.
- In scripts, use `--` before the executable to stop CLI option parsing:
  ```bash
  container machine run -n dev -- whoami
  container machine run -n dev -- /bin/sh -c 'whoami; pwd; echo "$HOME"'
  ```
- Avoid `-i` in heredoc-driven or non-interactive validation scripts; it can consume the rest of the script from stdin.
- If host `$PWD` is under your mounted macOS home, `pwd` may print a `/Users/<user>/...` path while `$HOME` remains `/home/<user>`.

For automation that can never allocate a first-run PTY, prefer `container run` unless the workflow truly needs machine persistence or init services. If machine semantics are required, make PTY-backed initialization an explicit provisioning step and verify a later headless command before relying on the environment.

## Reclaim Container Filesystem Space

`container clean` reclaims unused root-filesystem space and unused space in named volume mounts for specifically named running containers:

```bash
container clean app worker
```

Inspect the targets first. This is scoped reclamation, not a global prune command, and it requires the containers to be running.

## Experimental Local Kubernetes

Use `container k8s` only for a disposable single-node local cluster. It is experimental and updates kubeconfig state, so name the cluster explicitly and include teardown in the plan:

```bash
container k8s create --name local
container k8s load-image --name local local/app:dev
container k8s write-config --name local
kubectl --context local get nodes
container k8s delete --name local
```

Check `container k8s --help` on the installed version before scripting exact flags. Do not present this as production or multi-node Kubernetes. There is no `container compose`; translate a simple trusted stack into explicit lifecycle commands or keep a Compose-capable runtime.

## Custom Kernel Arguments

Use `--kernel-arg` only when the requested behavior belongs to the Linux kernel—for example, validating an LSM setting or reproducing a kernel boot issue. It is repeatable and applies to `run`/`create`; it is not an application environment mechanism.

```bash
container run --rm \
  --kernel-arg acme_debug=enabled \
  docker.io/library/alpine:latest \
  cat /proc/cmdline
```

Always verify `/proc/cmdline`; do not assume a duplicate key replaced every runtime default. Treat changes to `lsm`, module policy, panic behavior, or other security/reliability controls as privileged design decisions that require justification and user approval.

Nested virtualization:

```bash
container machine create --virtualization --kernel /path/to/vmlinux-kvm --name kvm-dev alpine:latest
container machine run -n kvm-dev -- ls -l /dev/kvm
```

Requirements: Apple Silicon M3 or later, supported macOS 26 or later, and a Linux kernel with `CONFIG_KVM=y`. Clear a custom kernel override with:

```bash
container machine set -n kvm-dev kernel=
```

## VS Code Remote SSH With A Machine

Use this only when the user wants a persistent IDE target.

1. Create or build a machine image with SSH server support.
2. Create the machine and DNS domain:
   ```bash
   sudo container system dns create machine
   container machine create --set-default --name ubuntu ubuntu-machine:latest
   ```
3. Set a password or suitable SSH auth inside the machine:
   ```bash
   container machine run -it sudo passwd "$(whoami)"
   ```
4. Add SSH config only after asking:
   ```sshconfig
   Host ubuntu.machine
     HostName ubuntu.machine
     ForwardAgent yes
     UserKnownHostsFile /dev/null
   ```
5. Connect from VS Code Remote SSH and open the project path under `/Users/<user>/...`.

## Persistent Defaults

Edit `~/.config/container/config.toml`; then restart services. Example:

```toml
[build]
cpus = 4
memory = "8gb"
rosetta = false

[container]
cpus = 4
memory = "2gb"

[machine]
cpus = 6
memory = "12gb"
homeMount = "ro"

[network]
subnet = "192.168.100.0/24"
subnetv6 = "fd00:abcd::/64"

[registry]
domain = "docker.io"
```

`[machine]` defaults affect newly created machines only. Use `container machine set` for existing machines.

## Cleanup

Inspect before deleting:

```bash
container list --all
container image list
container volume list
container network list
container machine ls
container k8s list
container system df
```

Only prune globally after explicit user approval:

```bash
container prune
container image prune
container volume prune
container network prune
```

For task-scoped validation, also check and stop/delete the builder if the task started a build and the user asked for no runtime remnants:

```bash
container builder status
container builder stop
container builder delete
```
