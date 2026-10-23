# Apple Container Skill

Use Apple's `container` CLI on Apple silicon macOS to run Linux containers, build OCI images, manage networks and volumes, and work in persistent Container Machines. The skill also covers registries, port forwarding, host access, filesystem reclamation, and experimental local Kubernetes.

## Install and use

Install the skill from your project:

```bash
npx skills add gabeosx/agent-skills --skill apple-container-skill
```

Choose your agent when prompted. See the [repository installation guide](../../README.md#install-a-skill) for CLI requirements and installation scope.

The supported runtime requires Apple silicon and macOS 26 or later. Install Apple's signed `container` release separately if needed. The agent checks the CLI and service versions, service status, and a smoke test before running the requested workload. The [skill instructions](SKILL.md) describe those checks and the security baseline through Apple Container 1.5.0.

## Workflows

- Run disposable Linux shells and services with bind mounts, ports, images, registries, volumes, and networks.
- Use Container Machines for persistent Linux workspaces, with image selection and host integration appropriate to the installed release.
- Diagnose startup, DNS, socket access, networking, and image-build failures with the bundled diagnostic helper. It can pull and run an Alpine container and make DNS and ping requests; account for those effects before running it.
- Choose isolation settings, SSH forwarding, environment passthrough, and cleanup scope explicitly. Release guidance distinguishes fixed defects from workarounds still needed on older runtimes.
- Reclaim filesystem space with `container clean`, inspect configuration in `~/.config/container/config.toml`, and use experimental single-node Kubernetes when the task calls for it.

The [workflow guide](references/workflows.md), [command reference](references/commands.md), and [troubleshooting guide](references/troubleshooting.md) provide the procedures. Kubernetes is experimental; the skill covers its kubeconfig effects and teardown limits.

## Validation history

The 1.1.0 skill release was validated on macOS 26.5 arm64 against an isolated signed and notarized Apple Container 1.2.0 payload. The 1.2.0 skill update preserves those live results and updates current guidance through Apple Container 1.4.1 using Apple's release history, tagged source, bundled skill, and staged CLI help without replacing the host runtime. The 1.3.0 skill update was validated live on macOS 27.0.1 arm64 against the signed Apple Container 1.5.0 installer (CLI and service both 1.5.0): the Alpine smoke test with DNS, an `ENTRYPOINT []` build-and-run, inside/outside port-publish checks, a stock `alpine:latest` Container Machine, and a full experimental k8s create/list/load-image/delete cycle all passed, and all test resources were removed afterward.

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
