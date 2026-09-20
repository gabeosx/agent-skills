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

## Check Known Fixed Defects Before Workarounds

Compare both `container --version` and `container system version` with the current Apple release. Upgrade first when the symptom matches a fixed runtime defect:

| Symptom | Fixed in | Temporary diagnostic |
| --- | --- | --- |
| Relative local path fails in `container cp` | 1.1 | Retry with an absolute host path. |
| Non-root process cannot use a mounted Unix socket | 1.1 | Confirm ownership/mode, then reproduce on 1.1+. |
| Image metadata unexpectedly inherits a same-named host environment variable | 1.2 | Remove the host variable and inspect image config; do not add implicit passthrough. |
| Valid build context is missing or misread | 1.2 | Use `--progress plain`, verify context path, then reproduce on 1.2+. |
| Published TCP/UDP connection opens but stalls | 1.2 | Prove the service works inside the container, then reproduce on 1.2+. |
| Machine API operation times out under load | 1.2 | Inspect machine/system logs, then reproduce on 1.2+. |
| Experimental `container k8s` plugin is absent from the signed package | 1.2.2 | Upgrade the complete installation; do not copy a plugin by hand. |
| Registry `--scheme auto` is rejected | Changed in 1.3 | Use the HTTPS default or explicit HTTP only for a trusted local registry. |
| Machine path setup fails under 1.2-era masked/read-only defaults | 1.3 | Upgrade before maintaining a custom path workaround. |
| Crafted IDs, image layers/layouts, registry auth, or host paths can cross trust boundaries | 1.3.1 and 1.4.1 | Stop processing untrusted OCI input and upgrade to 1.4.1 or newer. |

Do not turn a release-fixed defect into permanent project configuration.

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

Use Apple silicon (`arm64`). Treat macOS 26+ as supported. Older macOS releases are unsupported; do not present a workaround as supported operation.

## A Valid Command Reports A Plugin Or Service Error

Apple Container command groups are singular: `image`, `network`, `volume`, `machine`, `registry`, and `builder`. A plural typo such as `container images` can fall through to plugin discovery and report a misleading plugin or service problem. Compare the command with `container --help` before restarting services.

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
- For private dependencies, use `container build --ssh default`; do not copy private SSH keys into the build context or an image layer.
- If package downloads fail during build, run a normal container network smoke test first.
- For persistent build resources, edit `[build]` in `~/.config/container/config.toml` and restart services.
- For cleanup-sensitive validation, remember that `container build` can leave the BuildKit builder running. Use `container builder stop` and `container builder delete` when the user wants no runtime remnants.
- When testing an Apple Container source checkout, avoid building from macOS-protected or cloud-synchronized folders such as Desktop or Documents if `vmnet` entitlements or file access behave unexpectedly. Move the checkout to a neutral development path and retest before changing source.

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

- Test the service inside the container first (`container exec ... curl http://127.0.0.1:<container-port>` or an equivalent client), then test the host mapping. This separates an application startup failure from forwarding.
- Confirm the process inside the container listens on `0.0.0.0` or `::`, not just `127.0.0.1`.
- Confirm `-p` is `host-port:container-port`.
- Avoid host-port conflicts.

If a published connection opens but transfers no data, reproduce on 1.2+ before adding keepalive or proxy workarounds; 1.2 fixed a port-forward buffering defect.

## Unix Socket Fails

First identify which side creates the socket:

- Existing host socket consumed by a container: use `-v /absolute/host.sock:/run/service.sock`.
- Socket created by a container and consumed by the host: use `--publish-socket /absolute/host.sock:/run/service.sock`.

Do not swap these mechanisms just because the client reports permission denied. Check that the creating process is running, then inspect the socket type, numeric owner/group, and mode on both sides. Reproduce non-root failures on Apple Container 1.1+ because that release fixed mounted-socket access for non-root users.

## Environment Value Appears From The Host

Distinguish explicit from implicit inheritance:

- `-e NAME` and a bare `NAME` in an env file intentionally copy the host value.
- `-e NAME=value` and `NAME=value` in an env file are deterministic.
- A bare name stored in image metadata should not copy the host value on 1.2+.

For untrusted images, upgrade to 1.2+ rather than trying to scrub every host variable. Keep secrets out of image metadata and command lines even on the fixed runtime.

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

- Verify the image contains `/sbin/init`. On Apple Container 1.3+, try the requested standard image when it does; current Apple guidance uses `alpine:latest` directly.
- If plain Alpine logs `can't run '/sbin/openrc'` on a 1.2-era runtime, upgrade before preserving a custom-image workaround.
- If `/sbin/init` is absent, or managed services are required, derive a machine-capable image from the requested distro rather than switching distros silently. An Alpine service image can use OpenRC:
  ```dockerfile
  FROM docker.io/library/alpine:3.22
  RUN apk add --no-cache openrc openrc-init shadow sudo bash busybox-extras iproute2 curl coreutils
  RUN rc-update add local default || true
  CMD ["/sbin/openrc-init"]
  ```
- Installing `openrc` alone and setting `CMD ["/sbin/init"]` is not enough on Alpine: BusyBox init can start OpenRC and immediately shut the machine down. Use the `openrc-init` package and its executable.
- Build or choose a proper machine image with `/sbin/init`, systemd, or OpenRC rather than forcing an image that lacks init to boot.
- If the first headless `machine run` fails with `Operation not supported by device`, run the initialization command once from a real host terminal/PTY. After that succeeds, verify the same command without a TTY before putting it in CI. Prefer `container run` when unattended first-use is a hard requirement and machine semantics are unnecessary.
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

## Stop Signal Option Is Rejected

The released 1.4.1 CLI does not expose `container run --stop-signal`. Use one of the supported control points:

- Put `STOPSIGNAL SIG...` in the Dockerfile for an image-wide default.
- Use `container stop -s SIGNAL <name>` for a one-off operator choice.

Confirm the installed CLI surface with `container help run` instead of copying flags from a release summary.

## Registry Scheme Option Is Rejected

Apple Container 1.3 removed the old `--scheme auto` value. Current releases default to HTTPS and accept only `https` or `http`:

```bash
container registry login --scheme https registry.example.com
```

Use `--scheme http` only for a deliberately trusted local registry. If a generated command reference disagrees with installed help, trust the shipped parser and `container registry login --help`.

## Masked Or Read-Only Path Setup Fails

Confirm the current experimental flags first:

```bash
container help run | grep -E -- '--masked-path|--read-only-path'
```

Apple Container 1.3 relaxed default path restrictions for Container Machines. Upgrade a 1.2-era runtime before baking a workaround into an image. Never suggest the special value `NONE` merely to make a workload start; it clears that class of runtime security defaults and requires explicit approval.

## Nested Virtualization Fails

Requirements:

- Apple Silicon M3 or newer.
- Supported macOS 26 or newer.
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
