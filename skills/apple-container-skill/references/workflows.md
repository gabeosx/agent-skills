# Apple Container Workflows

Use this file when the user asks "how should I do X with Apple Container?" Prefer these workflows over raw command guessing.

## Install Or Upgrade

1. Verify host eligibility:
   ```bash
   sw_vers
   uname -m
   ```
   Apple silicon (`arm64`) is required. Treat macOS 26+ as the supported target. On macOS 15, warn about network limitations before proceeding.

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
   ```

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

If the project has both `Dockerfile` and `Containerfile`, pass `-f` explicitly. Use `--secret` for build secrets rather than putting tokens in Dockerfile layers.

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

## Persistent Container Machines

Use machines when the user wants a reusable Linux workspace rather than a single application container.

```bash
container machine create <bootable-machine-image> --name dev --set-default --cpus 4 --memory 8G --home-mount rw
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

- Plain OCI application images may fail because they do not boot as machine images.
- Plain `alpine:3.22` may create and inspect, but command execution can fail if `/sbin/openrc` is absent.
- For Alpine, build a machine image with OpenRC:
  ```dockerfile
  FROM docker.io/library/alpine:3.22
  RUN apk add --no-cache openrc shadow sudo bash busybox-extras iproute2 curl coreutils
  RUN rc-update add local default || true
  CMD ["/sbin/init"]
  ```
- For Ubuntu/Debian, build an image that includes `/sbin/init`, systemd, and required service setup.

Command invocation:

- In scripts, use `--` before the executable to stop CLI option parsing:
  ```bash
  container machine run -n dev -- whoami
  container machine run -n dev -- /bin/sh -c 'whoami; pwd; echo "$HOME"'
  ```
- Avoid `-i` in heredoc-driven or non-interactive validation scripts; it can consume the rest of the script from stdin.
- If host `$PWD` is under your mounted macOS home, `pwd` may print a `/Users/<user>/...` path while `$HOME` remains `/home/<user>`.

Nested virtualization:

```bash
container machine create --virtualization --kernel /path/to/vmlinux-kvm --name kvm-dev alpine:latest
container machine run -n kvm-dev -- ls -l /dev/kvm
```

Requirements: Apple Silicon M3 or later, macOS 15 or later, and a Linux kernel with `CONFIG_KVM=y`. Clear a custom kernel override with:

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
