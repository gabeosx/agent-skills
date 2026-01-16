# DevContainer Cheatsheet

## Common Properties

- `name`: (String) A display name for the container.
- `image`: (String) The Docker image to use (e.g., `mcr.microsoft.com/devcontainers/base:ubuntu`). Mutually exclusive with `dockerFile` and `dockerComposeFile`.
- `dockerFile`: (String) Path to a Dockerfile.
- `context`: (String) Path to the build context (default is `.` relative to `devcontainer.json`).
- `dockerComposeFile`: (String or Array) Path(s) to Docker Compose file(s).
- `service`: (String) The service in the Docker Compose file to use as the dev container.
- `workspaceFolder`: (String) The absolute path in the container where the workspace should be mounted.
- `features`: (Object) A set of Features to install. Keys are feature IDs, values are configuration objects (or `true`).

## Lifecycle Scripts

- `onCreateCommand`: Runs when the container is created.
- `updateContentCommand`: Runs when the content is updated.
- `postCreateCommand`: Runs after the container is created.
- `postStartCommand`: Runs after the container starts.
- `postAttachCommand`: Runs after the client attaches to the container.

## Settings & Extensions

- `customizations`: (Object) Tool-specific properties.
  - `vscode`:
    - `extensions`: (Array) List of extension IDs to install.
    - `settings`: (Object) VS Code settings to apply in the container.

## Ports & Environment

- `forwardPorts`: (Array) List of port numbers to forward.
- `containerEnv`: (Object) Environment variables to set in the container.
- `remoteEnv`: (Object) Environment variables to set for the remote extension/server.
- `remoteUser`: (String) The user to run as in the container (e.g., "vscode").

## Variable Substitution

- `${localWorkspaceFolder}`: Folder containing the source code on the local machine.
- `${containerWorkspaceFolder}`: Workspace folder in the container.
- `${localEnv:VAR_NAME}`: Local environment variable.
