# Apple Container Troubleshooting

Use this file when Apple Container does not install, start, build, network, publish ports, or boot machines correctly. Diagnose in order; do not patch application code until runtime smoke tests pass.

## Quick Diagnostic Order

```bash
sw_vers
uname -m
command -v container
container --version
container system status
```

If services are stopped:

```bash
container system start
```

Then run:

```bash
container run --rm docker.io/library/alpine:latest sh -lc 'cat /etc/resolv.conf; ip route 2>/dev/null || route -n; nslookup github.com'
container system logs --last 5m
```

For broader context:

```bash
bash skills/apple-container-skill/scripts/diagnose.sh
```

## Unsupported Or Missing CLI

Symptoms:

- `container: command not found`
- service refuses to start on Intel
- runtime is unreliable on older macOS

Checks:

```bash
uname -m
sw_vers -productVersion
```

Use Apple silicon (`arm64`). Treat macOS 26+ as supported. If the user is on macOS 15, explain the network limitations rather than trying to hide them.

## Homebrew Plugin Failure

Symptoms after Homebrew install:

- `container system start` loops or hangs.
- logs include missing plugins or `cannot find any plugins with type network`.

Action:

```bash
brew update
brew upgrade container
container system stop
container system start
```

If it still fails, prefer Apple's signed installer or gather logs before attempting symlink workarounds.

## First Start Asks For Kernel

On first `container system start`, accept the recommended default kernel for normal use. In non-interactive automation, do not pipe `Y` without user approval:

```bash
printf 'Y\n' | container system start
```

## Service Start Hangs

Checks:

```bash
container system logs --last 10m
launchctl list | rg 'com.apple.container|containermanagerd'
container system status --format json
```

Try a clean service restart:

```bash
container system stop
container system start --timeout 60
```

If this follows a Homebrew install, check the Homebrew plugin failure section first.

## BuildKit Or `container build` Fails

Checks:

```bash
container builder status
container build --progress plain -t local/test .
```

Fixes:

- Use `--progress plain` to capture logs.
- Increase resources:
  ```bash
  container builder stop
  container builder delete
  container builder start --cpus 8 --memory 16G
  ```
- Use `--no-cache` for stale or corrupt cache suspicion.
- If package downloads fail during build, run a normal container network smoke test first.
- For persistent build resources, edit `[build]` in `~/.config/container/config.toml` and restart services.
- For cleanup-sensitive validation, remember that `container build` can leave the BuildKit builder running. Use `container builder stop` and `container builder delete` when the user wants no runtime remnants.

## Rosetta Build Failures

Symptoms:

- Build fails on a fresh Apple silicon install.
- Logs suggest Rosetta is unavailable even for a build that should be arm64.

Choices:

- If x86_64 builds are not needed, disable build Rosetta:
  ```toml
  [build]
  rosetta = false
  ```
- If the user needs `linux/amd64`, install Rosetta and use `--platform linux/amd64` intentionally.

Restart services after editing `config.toml`.

## Container Networking Fails

Separate DNS from routing:

```bash
container run --rm docker.io/library/alpine:latest sh -lc 'ip route; cat /etc/resolv.conf; ping -c 1 -W 3 1.1.1.1; nslookup github.com'
```

If image pulls work but containers cannot resolve or route:

- Suspect VPN, endpoint security, firewall, or packet-filter interference.
- Inspect routes:
  ```bash
  netstat -rn -f inet | rg 'default|192\.168\.64|utun'
  container network inspect default
  ```
- Restart services after network changes:
  ```bash
  container system stop
  container system start
  ```
- On macOS 26+, try a non-conflicting custom network:
  ```bash
  container network create --subnet 192.168.105.0/24 devnet
  container run --rm --network devnet docker.io/library/alpine:latest sh -lc 'nslookup github.com'
  ```

If a VPN was enabled between a passing and failing test, tell the user that vmnet/VPN routing is the likely suspect.

## Host-Side Container DNS Is Flaky

Check the resolver entry and the embedded DNS service:

```bash
scutil --dns | rg -A6 'containerization|nameserver\\[0\\] : 127\\.0\\.0\\.1|port +: 2053'
sudo cat /etc/resolver/containerization.<domain>
dig @127.0.0.1 -p 2053 <container-name>.<domain>
container network inspect default
container list --format json
```

If `dig @127.0.0.1 -p 2053` fails, the issue is inside Apple Container DNS/network state. Recreate DNS/network only after capturing logs.

## Container-To-Host Service Fails

Do not try Docker's host alias. Use the supported localhost DNS flow:

```bash
sudo container system dns create host.container.internal --localhost 203.0.113.113
container run --rm alpine/curl curl http://host.container.internal:8000
```

Confirm the host service is actually running:

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
curl http://127.0.0.1:8000
```

Remember: creating a localhost domain can disable Private Relay, and packet-filter rules may need recreation after reboot.

## Port Publishing Fails

Checks:

```bash
container list
container inspect <container>
container logs <container>
lsof -nP -iTCP:<host-port> -sTCP:LISTEN
```

Fixes:

- Confirm the process inside the container listens on `0.0.0.0` or `::`, not just `127.0.0.1`.
- Confirm `-p` is `host-port:container-port`.
- Avoid host-port conflicts.

## Bind Mount Or Permission Issues

Use absolute paths:

```bash
container run --rm -v "$PWD:/work" -w /work alpine:latest ls -la
```

If permissions look wrong, check host filesystem permissions and macOS protected locations. Do not mount all of `$HOME` unless the user requests it.

Use `--ssh` for SSH agent forwarding:

```bash
container run --rm -it --ssh -v "$PWD:/work" -w /work ubuntu:24.04 bash
```

## Machine Mode Fails

Symptoms:

- `failed to boot container machine`
- `cannot exec: container is not running`
- `/sbin/init: not found`
- Ubuntu or Debian app image exits immediately

Checks:

```bash
container machine logs <name>
container machine inspect <name>
container machine ls
```

Fixes:

- Do not assume a plain OCI app image is bootable as a machine.
- If plain `alpine:3.22` logs `can't run '/sbin/openrc'`, treat that as a machine-image issue, not a generic CLI failure. Build an Alpine image with OpenRC:
  ```dockerfile
  FROM docker.io/library/alpine:3.22
  RUN apk add --no-cache openrc shadow sudo bash busybox-extras iproute2 curl coreutils
  RUN rc-update add local default || true
  CMD ["/sbin/init"]
  ```
- Build or choose a proper machine image with `/sbin/init`, systemd, or openrc rather than using a plain Ubuntu/Debian/Alpine app image.
- In scripts, run commands with an option terminator:
  ```bash
  container machine run -n <name> -- whoami
  container machine run -n <name> -- /bin/sh -c 'whoami; pwd; echo "$HOME"'
  ```
- Avoid `-i` in non-interactive scripts; it can consume heredoc/stdin content and end the script early.
- If config changed, restart:
  ```bash
  container machine stop <name>
  container machine run -n <name>
  ```
- Delete broken experimental machines only after confirming they contain no user data:
  ```bash
  container machine stop <name>
  container machine rm <name>
  ```

## Nested Virtualization Fails

Requirements:

- Apple Silicon M3 or newer.
- macOS 15 or newer.
- Custom Linux kernel with `CONFIG_KVM=y`; the default kernel does not provide KVM for this purpose.

Verify:

```bash
container machine run -n kvm-dev -- ls -l /dev/kvm
```

Clear a bad kernel override:

```bash
container machine set -n kvm-dev kernel=
container machine stop kvm-dev
container machine run -n kvm-dev
```

## Useful Logs

```bash
container system logs --last 5m
container logs --boot <container>
container logs -f <container>
container machine logs <machine>
container machine logs --boot <machine>
```
