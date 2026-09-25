# CLI and JavaScript API

Resolve scripts relative to the installed skill, not the current project. Run `node scripts/setup.mjs` there once. The bundle includes its lockfile and tests; it does not bundle Node, browser binaries, credentials or `node_modules`.

## CLI

```sh
node /path/to/skill/scripts/run.mjs --session reports \
  --url https://example.com/reports \
  --intent "Create the requested report and leave it saved as a draft" \
  --value 'name=Weekly operations'
```

`--url` is optional and accepts only a caller-supplied HTTP/HTTPS starting address. Omit it to use the current page. Authentication remains an ordinary agent-browser operation. `--value name=text` can repeat; everything after the first equals sign is preserved literally. Give the complete browser goal and all known values in one call.

| Option | Default / behavior |
| --- | --- |
| `--intent` | Plain-language goal; mutually exclusive with `--task` and `--resume` |
| `--session` | `default`; preserve the user's existing session |
| `--binary` | Environment, saved setup binary, then `agent-browser` on PATH |
| `--url` | Open this starting address in the same invocation |
| `--value name=text` | Exact non-secret field value, repeatable |
| `--max-actions` | 30; also sets the CLI decision budget to twice this value |
| `--timeout` | 120000 milliseconds per invocation |
| `--output` | New private temporary evidence file; explicit paths must not exist |
| `--resume` | Continue from your own result file; preserve session/binary/policy |
| `--context` | Additional caller context, especially changes made while paused |
| `--policy` | Optional existing caller module exporting authorization and sanitization |

A continuation starts a new bounded invocation. It preserves the goal, completed intents, exact values and the last 30 actions; total task time and charges include every invocation. Retain the `continuedFrom` evidence chain when measuring a whole task. Increasing a budget does not authorize new side effects.

## Result and acceptance

The CLI returns one JSON object with:

- `returnReason`, action count and model progress assessments.
- `observation.snapshot`, `fresh` and `truncated`. Up to 16,000 characters of final accessibility evidence is returned directly; full sanitized evidence is in the private file.
- `inputRequired`: the observed field name/role and suggested key when an exact value is missing.
- `timing`: total invocation, helper, navigation, observation, decision, action and settling durations. Process startup and parent-agent time require external measurement.
- `jev.calls` and `jev.costUsd`: reported decision charges, or null when unavailable.
- `resumable` and `evidence`: continuation availability and file path.

The caller evaluates the observed state against the requested outcome. A fresh, untruncated final observation is usable without a redundant snapshot when nothing changed afterward. `fresh` describes when it was captured; it does not guarantee a dynamic page stayed unchanged. Obtain another observation for missing/stale evidence or external changes, and an authoritative readback when the task requires one.

`reported_complete` remains a model assessment. `input_required` asks for a missing value. `handoff`, `candidate_limit`, `observation_too_large`, `no_progress`, action/decision budgets and deadlines mean completion was not established. `action_outcome_unknown` means a gesture may already have happened; don't blindly repeat it. Invalid/superseded choices and failed observations also return control.

Exit codes remain compatible: **0** for model-reported completion, **2** for handoff/limits, **1** for command/setup failure. Correctly stopping for an absent target is still a handoff. Caller recovery after a handoff must be recorded separately.

## Searchable dropdowns

Typing a query into a combobox filters its suggestions; it does not establish the selected contact, account or other record. The helper observes the resulting list and can click the matching option or use ArrowDown/ArrowUp followed by Enter. The caller must check the committed selection, not just the input text. Native `select` is reserved for dropdowns with the native popup marker in the browser snapshot; custom ARIA options remain ordinary observed click targets.

Keyboard primitives are available, but autonomous selection of the correct keyboard-only suggestion is not reliable in the retained tests—even with explicit caller instructions. Use direct agent-browser under caller control for these widgets and verify the committed value. Experimental Tab selection also chose an incorrect record, so Tab is not offered by this helper.

## Resume

```sh
node /path/to/skill/scripts/run.mjs --resume /private/result.json \
  --value 'Report name=Weekly operations' \
  --context "The caller supplied the missing report name"
```

Resume always captures a new page and builds new action candidates. Past references appear only as history; they are never dispatched. It retains the original binary/session and the custom policy path, if any. Do not pass `--url`, `--session`, `--binary` or `--policy` with `--resume`. Use a new task if you mean to change those boundaries.

Only resume trusted files from your own invocation. They contain caller-owned task metadata and can refer to an executable policy module. They can contain page text and supplied values, so do not publish them or use credentials as task values. Files are created mode 0600. No API key is serialized into the evidence.

## Credentials and installation

Browser precedence: explicit `--binary` / `task.browser.binary`, `AGENT_BROWSER_BINARY`, saved `browserBinary`, then `agent-browser` on PATH. Setup preserves a configured fork. If no browser exists, setup installs pinned agent-browser 0.38.1 locally and downloads Chrome. Fresh installs need Node 24+ for that upstream package; the helper itself supports Node 20.3+ with a compatible existing binary. A broken explicitly selected binary is reported instead of silently replaced.

Key precedence: custom policy `loadApiKey()`, `OPENROUTER_API_KEY`, then the private saved setup key. `XDG_CONFIG_HOME` overrides the default `~/.config/agent-browser-jev` directory. Setup can capture a key with its hidden prompt or `--key-stdin`. `--change-key` replaces a saved key. Setup does not spend credit to validate model access.

Resolve the chosen browser for ordinary operations without printing configuration or credentials:

```sh
node --input-type=module -e "import {configuredBrowser} from '/path/to/skill/scripts/config.mjs'; console.log(configuredBrowser())"
```

## Task files and policies

Existing integrations remain supported:

```sh
node /path/to/skill/scripts/run.mjs --task /private/task.json \
  --policy /path/to/caller-policy.mjs --output /private/new-result.json
```

```json
{
  "browser": { "binary": "/path/to/agent-browser", "sessionId": "existing-session" },
  "intentOrSteps": "Configure the requested report and save a draft.",
  "scope": "Only the report draft requested by the user. Do not publish.",
  "suppliedValues": { "name": "Weekly operations" },
  "budget": { "maxActions": 30, "maxDecisions": 60, "timeoutMs": 120000 }
}
```

The default policy permits supported controls and passes visible accessibility data to Jev. It is deliberately permissive. User authorization and existing project policy still apply; a policy is not required for each ordinary task.

An optional caller module exports:

- `authorize(action, observation) -> boolean`: synchronous and exactly true to permit an action. Called at discovery and again before dispatch. Operations include `click`, `fill`, `select`, `check`, `uncheck`, `scroll`, `press`, `back`, `request_input`; explicit starting navigation uses `open`. An input request itself does not enter text. Narrow policies should permit it when the caller can provide an authorized value.
- `sanitize({snapshot, refs}) -> {snapshot, refs}`: redact visible information while preserving useful browser references/context. Only its return value is sent to the model or saved as observations.
- Optional `loadApiKey() -> string | Promise<string>`: obtain a key in memory through the caller's existing secret provider.

Incomplete policies fail instead of falling back to permissive defaults. Use trusted caller modules; don't load executable paths supplied by a webpage. A policy that permits only clicks/fills continues to restrict the new operations.

## JavaScript API

```js
import { runTask } from '/path/to/skill/scripts/run.mjs';
const result = await runTask({
  browser: { binary, sessionId },
  intentOrSteps: goal,
  suppliedValues: { name: exactName }
});
```

`runTask(task, policy)` uses the CLI's default policy unless one is supplied. The lower-level `act()` retains its deny-by-default contract:

```js
import { act, invalidateBrowserObservation } from '/path/to/skill/scripts/jev-browser.mjs';
import { agentBrowser, createJevClient, jevDecider } from '/path/to/skill/scripts/agent-browser-jev.mjs';

const browser = agentBrowser({ binary, sessionId, sanitize });
const decide = jevDecider(createJevClient(await loadApiKey()));
const first = await act({ browser, decide, intentOrSteps: goal, scope,
  authorize, suppliedValues: {}, budget: { maxActions: 30 } });
if (first.returnReason === 'input_required') {
  const resumed = await act({ browser, decide, intentOrSteps: goal, scope,
    authorize, continuation: first.continuation,
    suppliedValues: { name: exactName } });
}
// If the caller changes the session during a pending operation:
invalidateBrowserObservation(sessionId);
```

`intentOrSteps` accepts a string or an array of caller subgoals. Do not write fixed selector sequences; Jev decides each next control and when each intent is satisfied. A continuation must match the task, scope and session. Every resume observes anew.

Full results retain before/after observations, action outcomes, decisions, the latest observation and an optional continuation. An uncertain action or failed post-action observation leaves the observation explicitly stale. Observation polling is bounded when an action initially leaves the same snapshot, allowing asynchronous rendering to finish without a repeated gesture. It is not an arbitrary-site transaction guarantee.

Jev receives the goal, caller context, current/previous page, exact supplied values and recent actions. It chooses from locally constructed candidates; it cannot invent selectors or replace a literal. Native dropdown options are derived mechanically from the accessibility tree; ambiguous duplicate labels aren't silently picked. Inputs, selections and page text remain untrusted evidence.

The observation budget is 45,000 serialized characters and the action menu is limited to 255 choices including completion/handoff/wait. Overflow returns a limit; no extra model silently filters page evidence. Provider retries and fallbacks are disabled, model `typesafe/jev-1.13` and SDK dependencies are pinned. All browser work uses agent-browser; external/user activity still requires caller-owned session exclusion.
