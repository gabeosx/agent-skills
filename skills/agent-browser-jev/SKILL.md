---
name: agent-browser-jev
description: Delegate multi-step browser tasks to Jev through agent-browser. It operates current page controls, requests missing input, and returns final observations or resumable handoffs without a caller turn per click.
metadata:
  version: "0.3.0"
---

# Agent Browser Jev

Give the helper a complete, bounded browser goal and exact non-secret values. Jev reads each new page and chooses the next action; agent-browser executes it. Keep planning, authorization, text composition and final acceptance with the caller. Use a direct browser command when the control is already known.

## Setup

Resolve scripts relative to this skill directory. Run `node scripts/setup.mjs` once; it installs dependencies, reuses agent-browser or installs a local copy, and prompts for an OpenRouter API key with input hidden. An existing `OPENROUTER_API_KEY` or saved key skips the prompt. Never request a key in chat. Keep an existing browser fork and credential provider with `--binary /path/to/agent-browser`. See [README](README.md#install-and-set-up).

## Delegate a goal

```sh
node /path/to/skill/scripts/run.mjs --session current-session \
  --intent "Configure the requested report and save it as a draft. Finish on the report list." \
  --value 'name=Weekly operations'
```

Use the existing authenticated session. Optional `--url https://example.com` opens a caller-supplied starting URL in the same invocation. Login, credentials and OTPs remain with agent-browser's authentication provider, outside model input. Resolve the saved binary via `configuredBrowser()` from `scripts/config.mjs` for direct browser operations; never print the raw configuration.

Delegate the coherent goal once instead of splitting it into individual clicks. Supply all known field values up front. No task file, custom policy, site parser or verification script is required. Defaults offer all supported controls and send visible page text to Jev. Existing project permissions/privacy still apply; reuse them via `--policy` when needed. See [API and options](references/usage.md).

## Read the result

The command returns `returnReason`, the final `observation`, missing input, timings, charges and a private `evidence` path.

- Evaluate the returned page against the requested outcome. `reported_complete` is the model's assessment, not proof. A fresh, untruncated observation can supply the evidence without another tool call. Re-observe when the page changed after the call, evidence is missing, the result says `fresh:false`, or the task requires a separate authoritative readback. Do not reopen a dialog just to reconfirm a value already established by the returned page.
- `input_required` identifies a field whose exact value is missing. Supply it from user instructions or authorized caller work, then resume. Do not invent missing user facts.
- A handoff or limit means completion was not established. Preserve that result. If later caller work completes the task, distinguish it from the helper's result. An absent target remains a handoff even when stopping was correct.
- An uncertain gesture may already have happened. Observe before deciding what to do next; never blindly repeat it.

## Continue the same task

```sh
node /path/to/skill/scripts/run.mjs --resume /path/from/evidence/result.json \
  --value 'Report name=Weekly operations'
```

Resume preserves the original session, binary, policy, goal, completed intents and recent actions. It always observes again and chooses new controls. It does not replay stored references. After caller intervention, add `--context "Dismissed the account notice; continue from the current page"`. Do not open the starting URL again. Use only trusted result files from your own task.

Defaults: 30 actions, 60 decisions, 120 seconds per invocation. Override with `--max-actions` and `--timeout` (milliseconds). Clicks, literal fills, native selects, checkbox check/uncheck, page scrolling, Enter/Escape/ArrowDown, back and brief waits are supported. Uploads, downloads, authentication, visual-only widgets and tab management remain direct agent-browser work. Keep the session exclusive during each call; the process-local lock cannot exclude people or other processes.

## Validation

`npm test` runs offline regressions. `npm run test:workflow -- --output new-report.json` tests sustained tasks and resume with real Jev/browser calls. `npm run benchmark:codex -- --suite workflow --output new-comparison.json` compares isolated native Codex sessions directly controlling agent-browser with Codex delegating the same goal. See [benchmarks and limits](references/benchmarks.md).
