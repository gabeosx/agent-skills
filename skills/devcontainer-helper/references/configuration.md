# Modern Dev Container Configuration

Use this reference after the environment architecture has been selected. Consult the live specification for exhaustive or time-sensitive details: <https://containers.dev/implementors/json_reference/>.

## Image, Build, And Compose

Use exactly one primary source for the development service.

Image:

```jsonc
{
  "image": "mcr.microsoft.com/devcontainers/base:ubuntuYY.MM"
}
```

`ubuntuYY.MM` is an instructional placeholder, not a valid default. Resolve and emit the explicit supported LTS variant.

Dockerfile:

```jsonc
{
  "build": {
    "dockerfile": "Dockerfile",
    "context": "..",
    "args": {
      "EXAMPLE": "value"
    },
    "target": "development"
  }
}
```

Prefer `build.dockerfile` and `build.context`. Do not introduce legacy top-level `dockerFile` or `context` properties.

Compose:

```jsonc
{
  "dockerComposeFile": ["../compose.yaml", "compose.devcontainer.yaml"],
  "service": "app",
  "workspaceFolder": "/workspace/project",
  "shutdownAction": "stopCompose"
}
```

Keep the development service running with an appropriate long-lived command when the base image would otherwise exit. Do not use `sleep infinity` blindly if the image already supplies a suitable command.

## Features And Lockfiles

```jsonc
{
  "features": {
    "ghcr.io/verified/publisher-feature:CURRENT_MAJOR": {
      "option": "value"
    }
  }
}
```

The identifier above is a placeholder. Resolve a real Feature and supported major from <https://containers.dev/features>.

The CLI writes the lockfile next to the configuration:

- `.devcontainer/devcontainer.json` → `.devcontainer/devcontainer-lock.json`
- `.devcontainer.json` → `.devcontainer-lock.json`

Commit the lockfile. Use `devcontainer outdated` to inspect updates, `devcontainer upgrade` to update the lockfile intentionally, and `--frozen-lockfile` in CI. Additional Features injected only through CLI flags are not part of the committed configuration contract.

For repositories hosted on GitHub, add version updates such as:

```yaml
version: 2
updates:
  - package-ecosystem: devcontainers
    directory: "/"
    schedule:
      interval: weekly
```

The `devcontainers` ecosystem updates Feature references and the associated lockfile. It does not currently provide Dependabot security updates, and Feature options such as a language-runtime version remain the project's responsibility.

## Users, Environment, And Mounts

- `containerUser`: process user for the container.
- `remoteUser`: user for lifecycle commands, terminals, and supporting tools.
- `updateRemoteUserUID`: local UID/GID alignment where supported.
- `containerEnv`: environment for the whole container.
- `remoteEnv`: environment for the remote user and supporting tools.
- `mounts`: additional mounts using string or structured form.

Do not assume every image contains a `vscode` user. Inspect the image or its documentation. Avoid manual recursive `chown` of large bind mounts; choose a compatible user/UID strategy.

Never put secret values in `containerEnv`, `remoteEnv`, build arguments, image layers, or the committed configuration.

## Ports

- `forwardPorts`: ports the supporting tool should forward.
- `portsAttributes`: labels, protocols, automatic forwarding behavior, and visibility for known ports.
- `otherPortsAttributes`: defaults for ports discovered at runtime.
- `appPort`: container-publish behavior retained for compatibility; prefer forwarding unless host publication is specifically required.

Bind application servers to the appropriate container interface. Forwarding a port cannot make a process listening on the wrong interface reachable.

Codespaces port visibility can expose a service beyond the codespace owner. Choose private, organization, or public visibility intentionally and follow organization policy.

## Lifecycle Commands

Lifecycle properties accept a string, an argument array, or an object of named commands. Object entries run in parallel:

```jsonc
{
  "onCreateCommand": {
    "dependencies": "./scripts/install-dependencies.sh",
    "tooling": "./scripts/setup-tooling.sh"
  }
}
```

If `tooling` depends on `dependencies`, use one ordered script instead. Keep scripts idempotent because containers and prebuilds may be recreated or content may be updated.

Use `waitFor` only when the supporting tool must wait for a lifecycle phase before connecting. Do not delay attach for work that can safely continue afterward.

## Host Requirements And Secrets

```jsonc
{
  "hostRequirements": {
    "cpus": 4,
    "memory": "8gb",
    "storage": "32gb"
  },
  "secrets": {
    "EXAMPLE_TOKEN": {
      "description": "Token required for the private package registry"
    }
  }
}
```

`secrets` declares recommended names and metadata; it does not store or provision the values. Verify how each target runtime injects them. Declare `hostRequirements` only for real minimums, since excessive requirements reduce Codespaces machine choices and increase cost.

## Customizations

Keep tool-specific configuration inside `customizations`:

```jsonc
{
  "customizations": {
    "vscode": {
      "extensions": [],
      "settings": {}
    },
    "codespaces": {
      "openFiles": []
    }
  }
}
```

Add extensions only when the repository benefits from them. Avoid turning personal editor preferences into shared environment policy.

Codespaces-specific options may include repository permissions, files to open, and automatic-configuration behavior. Check current GitHub documentation before emitting them.

## Codespaces Portability Caveats

- Most host bind mounts are ignored; do not design a Codespaces environment around arbitrary local paths.
- `${localEnv:NAME}` refers to the Codespaces host environment, not the developer's laptop.
- Host port mappings and `shutdownAction` do not have identical meaning across local and Codespaces runtimes.
- Read `hostRequirements` from `devcontainer.json`; do not rely on image metadata alone for Codespaces sizing.
- Prebuild configuration-change triggers may not detect every nested Dev Container layout. Verify the repository's selected configuration path.

For multiple configurations, place each at `.devcontainer/<name>/devcontainer.json` and ensure shared Dockerfiles, Compose files, scripts, and lockfiles resolve relative paths correctly.
