# Agent Browser Jev

**Give your agent a browser intent. Let Jev handle the next few UI decisions.**

`agent-browser-jev` is an Agent Skill with a small JavaScript helper that uses Jev to choose actions from the current [agent-browser](https://github.com/vercel-labs/agent-browser) accessibility snapshot. It executes through your existing browser session, observes the result, and continues until it reports completion or returns control to the calling agent.

The caller supplies the goal, permissions and exact input values. Jev interprets labels and surrounding context. Agent-browser performs the gestures. The caller checks the final evidence.

**Version:** 0.1.2. A general-purpose browser helper, with public fixtures, an opt-in real-browser/real-Jev acceptance suite, and recorded evidence. It contains no application-specific selectors, workflows or business logic.

## Why it was built

Browser automation often spends more time on the caller's repeated model/tool round trips than on the click itself. A capable agent may need to inspect a page, pick one control, issue a command, inspect again, and repeat—even for a short task it already understands.

We built this helper to keep those bounded interaction loops close to the browser. Jev makes the small, contextual decisions while the main agent retains the larger task and business judgment.

The initial experiments also exposed a trap: hard-coding row parsers, exact label sequences and screen-specific completion checks made the surrounding code duplicate the model's work. This implementation instead presents observed controls and their context to Jev. Code enforces mechanical boundaries: offered IDs, literal values, request binding, caller permissions and execution budgets.

The approach draws on [Browserbase's Jev integration](https://www.browserbase.com/blog/what-is-jev) and [Retriever's browser-action experiments](https://rtrvr.ai/blog/jev-browser-agent-benchmark): keep a capable caller in charge, ground choices against actual browser observations, and provide a way to hand back uncertainty. Our measurements below are our own development results, not those articles' benchmarks.

## When to use it

- Short tasks involving repeated labels, contextual controls or several UI transitions.
- Opening and closing details, reviewing a panel, or similar authorized interactions in an existing session.
- Work where avoiding per-click caller decisions is useful, while final verification can stay with the caller.

A direct agent-browser command is simpler when you already know the current reference. A maintained deterministic script may be faster for a stable, well-defined flow. The helper does not replace available application APIs, authorization policies, a full task planner, or business-specific verification.

## Installation with `npx skills`

Install just this skill from the collection:

```sh
npx skills add gabeosx/agent-skills --skill agent-browser-jev
```

For a project-local Codex installation without interactive prompts:

```sh
npx skills add gabeosx/agent-skills --skill agent-browser-jev --agent codex --yes
npm --prefix .agents/skills/agent-browser-jev ci --ignore-scripts --no-audit --no-fund
```

For a global Codex installation:

```sh
npx skills add gabeosx/agent-skills --skill agent-browser-jev --agent codex --global --yes
npm --prefix "$HOME/.agents/skills/agent-browser-jev" ci --ignore-scripts --no-audit --no-fund
```

The current installer uses `~/.agents/skills/agent-browser-jev` for global Codex installs. If you previously installed a manual copy under `~/.codex/skills`, migrate or remove that stale duplicate after checking for local customizations. Always use the path printed by your installer.

For another supported agent, choose it interactively or change `--agent`. Run `npm ci` in the installed skill directory reported by the installer. The [official skills CLI documentation](https://github.com/vercel-labs/skills#readme) explains agent selection, project/global scope and symlink/copy installation. **Installing skill files does not install their npm dependencies.** Repeat `npm ci` after updating the skill.

Before using the helper, provide:

| Requirement | Purpose |
| --- | --- |
| Node.js 20.3+ and npm | Run the helper and install its pinned SDK dependency. |
| An existing agent-browser executable and session | Supply the binary path and session ID. Keep your chosen fork and credential provider. |
| An OpenRouter key with access to `typesafe/jev-1.13` | Supply it through a secret provider or inherited `OPENROUTER_API_KEY`. |
| Caller authorization and privacy functions | Define which effects are permitted and which page content may reach Jev. |

The recorded live suite uses an agent-browser fork reporting version 0.33.2. Other builds must support the JSON snapshot/ref and action interface used here; run the included acceptance suite against your chosen binary. Keep your existing authentication provider, including Bitwarden when configured. The helper does not install a browser, replace a fork, or migrate credentials. Follow your binary's `skills get core` guidance for setup. The core tests cover macOS locally and Linux in CI; Windows is not yet validated.

## Using the skill with an agent

For example:

> Use $agent-browser-jev in the existing portal session to open the April statement's details, then close them and return to the list. This is read-only: don't edit, select or submit anything. Use the project's existing browser permissions and privacy filter, and show me the final result.

The skill tells the agent how to invoke the bundled helper. The example still needs a configured browser, Jev credentials and appropriate caller policy. It does not authorize every control on the page.

The caller can supply one bounded intent or a short list of intents. Jev chooses the next action and decides when to advance; the helper does not encode the website's button sequence.

## Command-line quick start

The CLI takes a task file, a trusted caller policy module and a new private output path:

```sh
node .agents/skills/agent-browser-jev/scripts/run.mjs \
  --task private/browser-task.json \
  --policy ./browser-policy.mjs \
  --output private/browser-result-001.json
```

Replace the skill path for a global or non-Codex installation. Task JSON:

```json
{
  "browser": {
    "binary": "/absolute/path/to/agent-browser",
    "sessionId": "portal"
  },
  "intentOrSteps": "Open the April statement details, then close them and return to the list.",
  "scope": "Only opening and closing statement details in the current authorized portal account.",
  "suppliedValues": {},
  "budget": {
    "maxActions": 6,
    "maxDecisions": 10,
    "timeoutMs": 45000
  }
}
```

`browser-policy.mjs` exports two functions and an optional credential loader:

```js
// Import your existing caller-owned policy and privacy functions.
export { authorize, sanitize } from './project-browser-policy.mjs';

// Optional: retrieve a key in memory from your configured secret provider.
export { loadApiKey } from './project-secrets.mjs';
```

Those imports are integration points, not files included in this skill. Their contracts are:

| Function | Contract |
| --- | --- |
| `authorize(action, observation)` | Return a synchronous boolean establishing whether this concrete action is allowed. Checked when offering candidates and again before dispatch. |
| `sanitize({snapshot, refs})` | Return the same shape with confidential visible data removed from both fields. Preserve reference IDs, roles and useful context. |
| `loadApiKey()` | Optionally return a string or promise from an existing secret provider. If omitted, the client uses inherited `OPENROUTER_API_KEY`. |

For a simple supervised task on a reviewed public page, a permission function might allow only that page's known read-only **Show details** and **Close** buttons. This restricts permitted effects; Jev still selects the correct item and action order. Do not reuse such a name list as a universal read-only classifier. A privacy filter may pass through content only when that content is already suitable to send to the model.

For that reviewed public-page example, the complete policy can be as small as:

```js
const reviewedReadOnlyButtons = new Set(['Show details', 'Close']);

export function authorize(action) {
  return action.op === 'click' && action.role === 'button' &&
    reviewedReadOnlyButtons.has(action.name);
}

// Appropriate only for the already-reviewed public page in this example.
export const sanitize = ({ snapshot, refs }) => ({ snapshot, refs });
// OPENROUTER_API_KEY is inherited from the configured secret environment.
```

For a private application, replace the pass-through filter with its actual redaction policy. Review the permitted controls for that application before adapting the example.

The skill intentionally does not decide which controls are safe across arbitrary websites. Reuse a project's existing policy rather than building a new row parser or runner for each task. Without the required CLI policy functions, execution fails before using the browser.

Keep API keys, passwords and OTPs out of task files, policy source, command arguments and model input. Browser authentication remains with the existing credential provider. Intents, supplied values, action labels and sanitized observations are model-visible.

## JavaScript API

The API supports callers that already manage browser policy and secret loading:

```js
import { act } from '/path/to/agent-browser-jev/scripts/jev-browser.mjs';
import {
  agentBrowser,
  createJevClient,
  jevDecider,
} from '/path/to/agent-browser-jev/scripts/agent-browser-jev.mjs';

const browser = agentBrowser({
  binary: configuredAgentBrowserPath,
  sessionId: existingSessionId,
  sanitize: projectPrivacyFilter,
});

const result = await act({
  browser,
  decide: jevDecider(createJevClient(await loadApiKey())),
  intentOrSteps: callerIntent,
  scope: authorizedScopeDescription,
  authorize: projectActionPolicy,
  suppliedValues: {},
  budget: { maxActions: 8, maxDecisions: 16, timeoutMs: 60000 },
});
```

Fill candidates use exact caller-supplied strings such as `{ searchText: 'April' }`; Jev can select a candidate but cannot replace its value. The live suite verifies exact text entry and preservation of a neighboring field on the bundled editor fixture; application-specific form behavior needs its own acceptance check. See the [usage reference](references/usage.md) for session invalidation and detailed API behavior.

## How it works

```mermaid
flowchart LR
  C[Caller: intent, values, permissions] --> O[agent-browser observation]
  O --> J[Jev: next action or progress decision]
  J --> V[Validate offered choice and authority]
  V --> A[agent-browser action]
  A --> O
  J --> R[Completion judgment or handoff]
  R --> F[Caller reviews evidence]
```

The runtime consists of a bounded loop, an agent-browser/Jev adapter and a CLI. It discovers ordinary semantic controls, preserves the full current accessibility context, and offers click/fill candidates plus a short wait, completion and handoff. It refreshes observations after gestures and never executes an invented selector or a response against a substituted candidate map.

There is no second browser stack, separate fallback agent, site-specific row parser, fixed outcome sequence or background service. Provider retries and fallback are disabled. Unsupported actions and exhausted budgets return to the same caller.

## Reproducible proof and measurements

The current release ships the tests used to validate its claims. They use generic catalog, editor and delayed-preview pages, so there is no dependency on a private application, customer account or proprietary test data.

| Claim | Reproducible check |
| --- | --- |
| Installed CLI actually runs, including symlinked paths | Command tests exercise direct, directory-symlink and file-symlink entrypoints; the live suite performs real actions through both direct and symlinked installs. |
| Jev distinguishes repeated labels using page context | Open and close project Beta with two identical Details buttons, then repeat with the cards in the opposite order. Fixture events identify the item actually opened. |
| Caller text reaches the intended field unchanged | Fill a message containing quotes, punctuation, Unicode and a newline; independently read back both fields and verify the unrelated title stayed unchanged. |
| The loop handles delayed rendering | Load a delayed preview and dismiss it after readiness. Server-recorded events must show load, ready, dismiss. |
| Missing targets and withheld permissions return control | Ask for an absent item and an unauthorized Publish action; require handoff and no UI mutation events. |
| Choices, permissions and budgets are checked mechanically | Offline tests cover unoffered choices, literal preservation, request/session binding, invalidation, revocation, concurrency, limits, timeouts and uncertain actions. |

### Offline tests

```sh
npm --prefix .agents/skills/agent-browser-jev test
```

There are **24 offline tests**. They need no API key or browser. CI runs them on Node 20.3.0 and 24; the command tests create temporary fake browser executables to verify the adapter/CLI boundary. These are not substitutes for the live suite below.

### Real browser + real Jev

With an OpenRouter key already supplied through your secret environment:

```sh
npm --prefix .agents/skills/agent-browser-jev run test:live -- \
  --binary /absolute/path/to/agent-browser \
  --output /absolute/path/to/new-acceptance-report.json
```

This starts a loopback-only fixture server and one uniquely named, disposable browser session. It runs the installed **command-line entrypoint**, using real agent-browser snapshots/actions and real Jev API calls. It never attaches to your existing application session. The harness closes only its own browser session/server and removes its temporary task files. The report remains at the requested new path.

This suite makes billable model calls. It uses synthetic public fixture data, no login and no application writes outside the fixture. Its policy permits fixture controls on all eligible items; it does not provide the correct row/ref or action sequence. Assertions inspect DOM-generated server events and independent final browser readbacks, not just the helper's completion claim. A failed case stops the suite and is retained in the report; it is never automatically retried into a pass.

The report records each outcome, before/after observations, actual events, model usage cost, elapsed time, Node/browser versions, source hashes and cleanup status. See [the recorded results and development failures](references/proof.md) for the current measurements and exact evidence files.

**Performance interpretation:** timings include CLI startup, decisions, browser gestures and observations for these local fixtures. Browser startup/navigation to each case is excluded. Model charges exclude caller planning/review and browser infrastructure. These are single-run acceptance measurements, not a statistical benchmark or a comparison with another agent. Historical prototype speed comparisons have been removed from this README because they did not measure the packaged implementation and their private source data was not reproducible here.

### What this does not prove

Passing the suite demonstrates these particular behaviors on the recorded browser/model configuration. It does not prove all websites, all browsers, all layouts, or every future model response. It does not automatically discover safe actions, verify a business result, or make browser observations atomic with gestures. Unsupported and ambiguous work still belongs with the caller.

## Results, limits and troubleshooting

The helper returns `actions` with before/after observations, `latestObservation`, `progressAssessment`, `decisions`, and `returnReason`. **`reported_complete` is a model judgment.** The caller remains responsible for accepting the result and performing any required business readback.

| Situation | What to do |
| --- | --- |
| `reported_complete` | Review the returned evidence and any task-specific acceptance requirements. |
| `handoff`, denied authority or unsupported control | Continue in the same caller; clarify the target or use another authorized operation. |
| Action/decision budget or deadline | Inspect current state before deciding on a new bounded task. Do not increase limits blindly. |
| `action_outcome_unknown` | A gesture may already have happened. Observe before considering a retry. |
| Superseded observation or external browser activity | Obtain fresh state and restore exclusive session ownership. |
| Observation too large | Narrow the task/context; the helper does not silently rank away controls. |
| Missing SDK or model credentials | Run `npm ci` in the installed skill and check the caller's secret configuration. |

The CLI exits `0` for model-reported completion, `2` for a returned handoff/runtime limit, and `1` for setup failure. It writes a new mode-600 evidence file; an existing output path is rejected. Output may contain sensitive task data after filtering, so keep it outside version control. No raw provider/CLI errors are printed. An empty result object after setup failure is not task success.

The in-process lock complements the caller's existing session coordination; it cannot prevent another process or person from changing the page. Observation and gesture are not atomic. On a failed post-action observation, the last available snapshot may predate the gesture. Never equate a successful tool call with completed business work.

The current primitive set does not include a navigation planner, autocomplete-selection engine, upload/download workflow or automatic authentication recovery. Use existing authorized agent-browser operations for those capabilities. Publishing, purchases, account changes and other consequential actions require the caller's established authorization and readback arrangements. Synthetic fixture interactions do not validate those business operations.

## Maintaining the skill

The bundled implementation is in [`scripts/`](scripts/), operating instructions in [`SKILL.md`](SKILL.md), and tests in [`tests/`](tests/). No originating-project dependency, credentials, private traces, browser profile or `node_modules` directory is included.

After changing the helper, run `npm test`. For repository contributions, also follow [the repository policy](https://github.com/gabeosx/agent-skills/blob/main/.agents/AGENTS.md), update `metadata.version` and the npm version together, and record the change in the [root changelog](https://github.com/gabeosx/agent-skills/blob/main/CHANGELOG.md). Keep `SKILL.md` focused on agent behavior and this README focused on human setup, usage and evidence.
