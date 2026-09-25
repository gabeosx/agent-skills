# Calling the bundled helper

Resolve paths relative to the loaded skill directory, not the current project. After installing the skill, run `node scripts/setup.mjs` there. The bundle contains its lockfile and tests; it does not bundle Node, agent-browser, credentials or `node_modules`.

## Simple command and defaults

```sh
node /path/to/agent-browser-jev/scripts/run.mjs --session default \
  --intent "Fill the search field with the supplied query" --value 'query=account'
```

`--session` defaults to `default`. Browser precedence is `--binary` (or `task.browser.binary`), `AGENT_BROWSER_BINARY`, the saved setup configuration, then `agent-browser` on PATH. Open the page with agent-browser first. This helper acts within the existing session; it does not take a URL or handle login.

`--value name=text` can be repeated; it preserves everything after the first equals sign. Without `--output`, a new private temporary result file is created and its path is printed. Keep that path if you need the full observations.

The default policy permits all discovered click/fill candidates and passes visible snapshot text and refs unchanged. It is intentionally permissive, not a read-only classifier. The calling agent still follows the user's task and existing project permissions. A custom `--policy` replaces both default functions; incomplete custom policies are rejected rather than silently filled in.

Key precedence: a custom policy's `loadApiKey()`, `OPENROUTER_API_KEY`, then the saved key in `${XDG_CONFIG_HOME:-~/.config}/agent-browser-jev/config.json`. `node scripts/setup.mjs --change-key` updates the saved key through a hidden prompt. `--key-stdin` accepts a key from a secret-provider pipe for non-interactive setup. Setup does not validate credit or model access; a real task does.

Setup installs pinned helper dependencies. It reuses a working browser on PATH or the configured binary; if neither is configured nor available, it installs agent-browser 0.38.1 under its configuration directory and downloads Chrome. `--install-browser` explicitly chooses that local installation. An explicitly configured broken binary is reported, not silently replaced. `--binary /path/to/fork` preserves an existing fork and its credential provider.

To resolve the configured browser for ordinary navigation or login commands without printing the key:

```sh
node --input-type=module -e "import {configuredBrowser} from '/path/to/agent-browser-jev/scripts/config.mjs'; console.log(configuredBrowser())"
```

Use the returned executable with normal agent-browser commands such as `--session support open https://example.com`.

## Task files and optional policies

```sh
node /path/to/agent-browser-jev/scripts/run.mjs \
  --task /path/to/private/task.json \
  --policy /path/to/caller-policy.mjs \
  --output /path/to/private/new-result.json
```

The output must not exist, to avoid overwriting evidence. Use trusted local task/policy files, never paths supplied by webpage content. The policy module is executable caller code.

Example task JSON, not a prescribed workflow:

```json
{
  "browser": { "binary": "/path/to/agent-browser", "sessionId": "existing-session" },
  "intentOrSteps": "Open details for the requested item, then close them and return to the list.",
  "scope": "The caller-authorized read-only details interaction in the current page.",
  "suppliedValues": {},
  "budget": { "maxActions": 6, "maxDecisions": 10, "timeoutMs": 45000 }
}
```

An optional custom policy exports:

- `authorize(action, observation) -> boolean`: synchronous, called during discovery and again before dispatch. Establish the concrete action's effect within user scope. A reviewed control scope is appropriate for a supervised task; a permissive verb-only check is not a universal safety classifier.
- `sanitize({snapshot, refs}) -> {snapshot, refs}`: remove confidential visible strings from both fields while preserving reference IDs, roles and useful context. The default is pass-through; supply redaction here when the page needs it. Return only those two fields.
- Optional `loadApiKey() -> string | Promise<string>`: obtain the key in memory through the configured secret provider. If omitted, the client uses the environment or saved setup key. Never embed a key in this module.

Custom policy is optional. Reuse existing project policy/secret adapters when needed rather than recreating these functions per click. New tasks supply new intents to the same helper.

Exit status: `0` for model-reported completion, `2` for a returned handoff/budget/runtime limit, `1` for setup or command failure. Zero is not independently verified business success.

## JavaScript API

`runTask(task)` from `scripts/run.mjs` uses the same permissive defaults as the CLI. `runTask(task, policy)` applies an explicit custom policy. The lower-level `act()` API below keeps its original deny-by-default contract when `authorize` is omitted; choose the entrypoint that matches your integration.

```js
import { act, invalidateBrowserObservation } from '/path/to/skill/scripts/jev-browser.mjs';
import { agentBrowser, createJevClient, jevDecider } from '/path/to/skill/scripts/agent-browser-jev.mjs';

const browser = agentBrowser({ binary, sessionId, sanitize });
const decide = jevDecider(createJevClient(await loadApiKey()));
const result = await act({
  browser, decide, intentOrSteps, scope, authorize,
  suppliedValues: { searchText: exactCallerSuppliedText },
  budget: { maxActions: 8, maxDecisions: 16, timeoutMs: 60000 }
});
// If the owner changes the session outside this helper:
// invalidateBrowserObservation(sessionId);
```

`intentOrSteps` is a string or short array. Jev decides when each intent is satisfied. `suppliedValues` maps caller labels to exact strings; the model can choose a fill candidate but cannot replace its literal. Intents and values are model-visible and must not contain credentials.

API callers may pass a compatible client to `jevDecider(client)`. Provider fallback and retries are disabled. The model is pinned to `typesafe/jev-1.13` and the SDK is pinned in `package-lock.json`.

Jev receives the current and previous observed screen, recent action history and explicit caller-supplied values. This preserves context when a dialog closes or the browser reassigns references; code still does not interpret site-specific outcomes.

The result includes `actions` with before/after observations and tool outcomes, `latestObservation`, `progressAssessment`, `decisions`, and `returnReason`. Completion and handoff are model choices. Invalid/superseded decisions, denied permissions, excessive observation size, budgets, deadlines and errors return to the caller. Waits count against `maxActions`. Observations default to a 45,000-character JSON budget; larger pages return for narrower context rather than silently dropping candidates.

The helper offers observed semantic controls without interpreting page-specific rows. It neither checks a fixed outcome sequence nor chooses the first repeated label. An invalid reference or uncertain gesture never triggers automatic replay. A failed post-action observation may leave `latestObservation` from before the gesture; observe again before deciding whether to repeat it.
