#!/bin/bash
set -u

section() {
  printf '\n== %s ==\n' "$1"
}

run() {
  printf '$ %s\n' "$*"
  "$@" 2>&1 || true
}

section "Host"
run sw_vers
run uname -m

section "Container CLI"
if ! command -v container >/dev/null 2>&1; then
  echo "container CLI not found on PATH"
  echo
  echo "Install with Apple's signed installer from:"
  echo "  https://github.com/apple/container/releases"
  echo
  echo "Homebrew can also be used if the user prefers:"
  echo "  brew install container"
  echo
  echo "Requires Apple silicon. macOS 26+ is the supported target."
  exit 0
fi

run container --version

section "Released CLI Surface"
run_help="$(container help run 2>&1 || true)"
if printf '%s\n' "$run_help" | grep -q -- '--kernel-arg'; then
  echo "run --kernel-arg: available"
else
  echo "run --kernel-arg: unavailable (upgrade before relying on 1.2 behavior)"
fi
if printf '%s\n' "$run_help" | grep -q -- '--stop-signal'; then
  echo "run --stop-signal: available"
else
  echo "run --stop-signal: unavailable; use image STOPSIGNAL or container stop -s"
fi
if printf '%s\n' "$run_help" | grep -q -- '--masked-path' && printf '%s\n' "$run_help" | grep -q -- '--read-only-path'; then
  echo "run isolation paths: available"
else
  echo "run isolation paths: unavailable (upgrade before relying on 1.2.1+ behavior)"
fi

build_help="$(container help build 2>&1 || true)"
if printf '%s\n' "$build_help" | grep -q -- '--ssh'; then
  echo "build --ssh: available"
else
  echo "build --ssh: unavailable (upgrade before forwarding SSH into builds)"
fi

registry_help="$(container registry login --help 2>&1 || true)"
if printf '%s\n' "$registry_help" | grep -q -- 'auto'; then
  echo "registry scheme: legacy auto value present; current releases accept https or http"
else
  echo "registry scheme: no legacy auto value found"
fi

if container help clean >/dev/null 2>&1; then
  echo "container clean: available"
else
  echo "container clean: unavailable (added in 1.4.1)"
fi

if container k8s --help >/dev/null 2>&1; then
  echo "experimental container k8s: available"
else
  echo "experimental container k8s: unavailable"
fi

section "System Status"
run container system status

section "System Version"
run container system version

section "Networks"
run container network list
run container network inspect default

section "Machines"
run container machine list

section "Host Routes"
netstat -rn -f inet 2>/dev/null | grep -E 'default|192\.168\.64|utun|bridge' || true

section "DNS Resolver Entries"
if command -v scutil >/dev/null 2>&1; then
  scutil --dns 2>/dev/null | grep -E -A6 'containerization|nameserver\\[[0-9]+\\] : 127\\.0\\.0\\.1|port +: 2053' || true
fi
ls -la /etc/resolver 2>/dev/null | grep containerization || true

section "Container Network Smoke Test"
container run --rm docker.io/library/alpine:latest sh -lc '
  echo "--- /etc/resolv.conf ---"
  cat /etc/resolv.conf
  echo "--- route ---"
  (ip route 2>/dev/null || route -n 2>/dev/null || true)
  echo "--- dns ---"
  nslookup github.com 2>&1 || true
  echo "--- public ip ping ---"
  ping -c 1 -W 3 1.1.1.1 2>&1 || true
' || true

section "Recent System Logs"
container system logs --last 5m 2>&1 | tail -120 || true

cat <<'EOF'

Interpretation hints:
- If container is missing, install it before continuing.
- Compare CLI and service versions. Upgrade before working around defects already
  fixed in the current Apple Container release. Use 1.4.1+ for untrusted OCI input.
- If images pull but container DNS or ping fails, check VPN, endpoint security,
  firewall, or vmnet route conflicts before changing application code.
- If host-side container DNS is flaky, test directly with:
    dig @127.0.0.1 -p 2053 <container>.<domain>
- If Homebrew install cannot find plugins, run:
    brew update && brew upgrade container
EOF
