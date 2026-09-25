# Agent invocation contract

The installed skill tells the agent when and how to invoke `scripts/run.mjs`. The helper is a non-interactive, one-shot process: arguments describe one bounded browser goal, and stdout contains one JSON result. It does not accept or create task, policy, result or evidence files.

## New task

```sh
node /path/to/skill/scripts/run.mjs --session reports \
  --url https://example.com/reports \
  --intent "Create the requested report and leave it saved as a draft" \
  --value 'name=Weekly operations'
```

`--url` is optional and accepts only a caller-supplied HTTP or HTTPS starting address. Omit it to use the current page. Authentication remains an ordinary agent-browser operation. Repeat `--value name=text` for every exact non-secret value; everything after the first equals sign is preserved literally.

For upload, pass the user-authorized absolute path as a value. The helper offers it only to an observed file control and never opens a native chooser or invents a path. The path is sent to Jev with the other supplied values, so do not use uploads or task values for secrets.

| Argument | Default / behavior |
| --- | --- |
| `--intent` | Complete plain-language goal for a new task |
| `--session` | `default`; use an existing agent-browser session |
| `--binary` | Environment, saved setup binary, then `agent-browser` on `PATH` |
| `--url` | Optional starting page for a new task |
| `--value name=text` | Exact non-secret value; repeatable |
| `--allow operation` | Permit one operation on any matching control; repeatable |
| `--allow 'operation:Exact name'` | Permit one operation only on that accessible control name |
| `--max-actions` | 30; the decision budget is twice this value |
| `--timeout` | 120000 milliseconds |
| `--context` | Trusted context from the calling agent |
| `--resume-token` | Continue an incomplete call; mutually exclusive with `--intent` |

Supported allowlist operations are `click`, `hover`, `fill`, `upload`, `select`, `set_date`, `check`, `uncheck`, `scroll`, `press` and `back`. A caller-supplied starting URL remains allowed. When no `--allow` rule is present, all supported operations are available. When at least one rule is present, unmatched gestures are not offered. A matching `fill` rule also permits the helper to request a missing value for that field.

## Result

Every valid invocation exits normally and prints one JSON object. A browser handoff is a valid tool result, not a process failure.

- `returnReason`: `reported_complete`, `input_required`, or a bounded handoff reason.
- `observation`: up to 16,000 characters of the final accessibility snapshot, plus `fresh` and `truncated` flags.
- `actions`: a compact trace with operation, target and outcome; it does not repeat page snapshots or entered values.
- `inputRequired`: the observed field name and role when an exact value is missing.
- `progressAssessment`: intent steps Jev judged complete.
- `timing`: total, helper, navigation, observation, decision, action and settling time.
- `jev.calls` and `jev.costUsd`: provider calls and reported charge when available.
- `resumable` and `resumeToken`: whether another invocation can continue the same task.

`reported_complete` is Jev's assessment, not independent proof. The calling agent evaluates the final observation against the requested outcome. A fresh, untruncated observation is usable evidence when nothing changed afterward. Re-observe when it is stale, truncated, missing, or the task needs an authoritative readback.

`handoff`, `candidate_limit`, `observation_too_large`, `no_progress`, action or decision budgets, and deadlines mean completion was not established. `action_outcome_unknown` means a gesture may already have happened; observe before doing anything else and never blindly repeat it.

Invalid invocation, configuration, or token errors exit with status 1 and a small JSON error. Valid task outcomes, including handoffs, use status 0 so an agent can parse the result without treating an expected boundary as a crashed command.

## Resume

```sh
node /path/to/skill/scripts/run.mjs --resume-token "$RESUME_TOKEN" \
  --value 'Report name=Weekly operations' \
  --context "The caller dismissed the account notice"
```

Resume always observes the current page and builds new action candidates. Old element references are history only and are never dispatched. The token preserves the browser, session, goal, operation allowlist, completed intents, supplied values and recent actions. Do not pass `--url`, `--session`, `--binary` or `--allow` while resuming.

Resume tokens are compressed, encrypted and authenticated with a key derived from the configured OpenRouter credential. They expire after 30 minutes and fail closed if altered, expired or opened under another key. A token contains task state and exact non-secret values; treat it as private and do not publish it.

## Searchable dropdowns

Typing into a combobox filters suggestions; it does not establish the selected contact, account or other record. The helper can click an accessible matching option. It does not offer arrow/Enter selection on autocomplete fields because similar options can commit the wrong record. The caller must use direct agent-browser control for a keyboard-only picker and verify the committed selection, not merely the input text.

## Credentials and browser selection

Browser precedence is explicit `--binary`, `AGENT_BROWSER_BINARY`, the binary saved by setup, then `agent-browser` on `PATH`. The OpenRouter key comes from `OPENROUTER_API_KEY` or the owner-readable setup configuration. Neither the key nor raw provider output appears in the task result or resume token.

Setup can install pinned agent-browser 0.38.1 when no compatible executable is available. Fresh installation needs Node.js 24 or newer; the helper itself supports Node.js 20.3 or newer with an existing compatible browser.

## Maintainer API

`runTask(task, { apiKey })` is available for the bundled tests and integrations inside this package. The public skill contract is the executable above. The lower-level `act()` API remains deny-by-default and accepts explicit browser, decision and authorization functions for focused unit tests.
