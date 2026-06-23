# Apple Container Command Reference

Use this as a concise command map after selecting a workflow. Prefer `SKILL.md` and `workflows.md` for decision-making.

## System

```bash
container system start [--enable-kernel-install|--disable-kernel-install] [--timeout 60]
container system stop
container system status [--format json|table|yaml|toml]
container system version [--format json|table|yaml|toml]
container system logs [--follow] [--last 5m]
container system df [--format json|table|yaml|toml]
container system kernel set --recommended
container system property list [--format json|toml]
```

`system property list` is read-only. Use `~/.config/container/config.toml` for defaults.

DNS:

```bash
sudo container system dns create test
sudo container system dns create host.container.internal --localhost 203.0.113.113
container system dns list [--format json|table|yaml|toml] [--quiet]
sudo container system dns delete test
```

## Containers

```bash
container run [options] <image> [command...]
container create [options] <image> [command...]
container start [-a] [-i] <container...>
container stop [-s SIGTERM] [-t 5] <container...>
container kill [-s KILL] <container...>
container delete|rm [-f] <container...>
container list|ls [-a] [-q] [--format json|table|yaml|toml]
container inspect <container...>
container exec [-it] [-d] [-e KEY=VALUE] [-w DIR] [-u USER] <container> <command...>
container logs [-f] [-n 100] [--boot] <container>
container stats [--no-stream] [--format json|table|yaml|toml] [container]
container copy|cp <local> <container:path>
container copy|cp <container:path> <local>
container export [-o path.tar] <container>
container prune
```

Important `run/create` options:

- `--rm`, `-d/--detach`, `-it`, `--name`
- `-p/--publish [host-ip:]host-port:container-port[/protocol]`
- `-v/--volume source:target`, `--mount type=...,source=...,target=...,readonly`
- `--publish-socket host_path:container_path`
- `-e/--env`, `--env-file`
- `-w/--workdir/--cwd`, `-u/--user`, `--uid`, `--gid`
- `--cpus`, `--memory`, `--shm-size`, `--tmpfs`
- `--cap-add`, `--cap-drop`, `--ulimit`
- `--dns`, `--dns-domain`, `--dns-search`, `--dns-option`, `--no-dns`
- `--network name[,mac=XX:XX:XX:XX:XX:XX][,mtu=VALUE]`
- `--platform`, `--arch`, `--os`, `--rosetta`
- `--init`, `--init-image`, `--entrypoint`, `--read-only`, `--ssh`, `--virtualization`
- `--scheme`, `--progress`, `--max-concurrent-downloads`

## Build And Images

```bash
container build -t local/app:dev [-f Dockerfile] [--progress plain] .
container image pull [--platform linux/arm64] <reference>
container image push <reference>
container image list|ls [-q] [-v] [--format json|table|yaml|toml]
container image inspect <image...>
container image tag <source> <target>
container image save -o image.tar <image...>
container image load -i image.tar
container image delete|rm [-a] [-f] [image...]
container image prune [-a]
```

Useful build flags:

- `--build-arg key=value`
- `--secret id=key[,env=ENV_VAR|,src=local/path]`
- `--target stage`
- `--no-cache`, `--pull`, `--quiet`
- `--platform os/arch[/variant]`, `--arch`, `--os`
- `--cpus`, `--memory`
- `--dns`, `--dns-domain`, `--dns-search`, `--dns-option`
- `--output type=oci|tar|local[,dest=...]`

## Builder

```bash
container builder status [--format json|table|yaml|toml] [-q]
container builder start --cpus 4 --memory 8G [--dns 1.1.1.1]
container builder stop
container builder delete|rm [-f]
```

## Networks

Network create and custom network attachment require macOS 26+.

```bash
container network create [--internal] [--subnet 192.168.100.0/24] [--subnet-v6 fd00:1234::/64] <name>
container network list|ls [-q] [--format json|table|yaml|toml]
container network inspect <network...>
container network delete|rm [-a] [network...]
container network prune
```

## Volumes

```bash
container volume create [-s 10G] [--opt journal=ordered] <name>
container volume list|ls [-q] [--format json|table|yaml|toml]
container volume inspect <volume...>
container volume delete|rm [-a] [volume...]
container volume prune
```

Anonymous volumes are created by `-v /path` or `--mount type=volume,dst=/path`; they are not removed by `--rm`.

## Registry

```bash
container registry login [--scheme auto|https|http] [-u user] [--password-stdin] <server>
container registry logout <server>
container registry list|ls [-q] [--format json|table|yaml|toml]
```

## Container Machines

`container machine` has alias `container m`.

```bash
container machine create [options] <image>
container machine run [-n name] [--root] [-d] [command...]
container machine list|ls [-q] [--format json|table]
container machine inspect [name]
container machine set [-n name] cpus=4 memory=8G home-mount=ro
container machine set [-n name] virtualization=true kernel=/path/to/vmlinux-kvm
container machine set [-n name] kernel=
container machine set-default <name>
container machine logs [--boot] [-f] [-n 100] [name]
container machine stop [name]
container machine delete|rm <name>
```

Create options:

- `--name`, `--set-default`, `--no-boot`
- `--cpus`, `--memory`, `--home-mount rw|ro|none`
- `--virtualization`, `--kernel`
- `--platform`, `--arch`, `--os`
- `--scheme`, `--progress`, `--max-concurrent-downloads`

Do not teach unmerged PR-only flags such as `--home-mount-path` until they land upstream.
