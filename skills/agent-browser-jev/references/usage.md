# Calling the bundled helper

Resolve paths relative to the loaded skill directory, not the current project. After copying/installing the skill, run `npm ci --ignore-scripts --no-audit --no-fund` there. The bundle contains its lockfile and tests; it does not bundle Node, agent-browser, credentials or `node_modules`.

## Command interface

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

Caller policy exports:

- `authorize(action, observation) -> boolean`: synchronous, called during discovery and again before dispatch. Establish the concrete action's effect within user scope. A reviewed control scope is appropriate for a supervised task; a permissive verb-only check is not a universal safety classifier.
- `sanitize({snapshot, refs}) -> {snapshot, refs}`: remove confidential visible strings from both fields while preserving reference IDs, roles and useful context. A pass-through filter is appropriate only for content already suitable for the model. Return only those two fields.
- Optional `loadApiKey() -> string | Promise<string>`: obtain the key in memory through the configured secret provider. If omitted, the client uses inherited `OPENROUTER_API_KEY`. Never embed a key in this module.

Reuse existing project policy/secret adapters rather than recreating these functions per click. New tasks supply new intents to the same helper.

Exit status: `0` for model-reported completion, `2` for a returned handoff/budget/runtime limit, `1` for setup or command failure. Zero is not independently verified business success.

## JavaScript API

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
