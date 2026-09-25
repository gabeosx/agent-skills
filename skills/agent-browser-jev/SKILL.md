---
name: agent-browser-jev
description: Delegate multi-step browser tasks to Jev through agent-browser. It operates current page controls, requests missing input, and returns final observations or resumable handoffs without a caller turn per click.
metadata:
  version: "1.0.1"
---

# Agent Browser Jev

Give the helper a complete, bounded browser goal and exact non-secret values. Jev reads each new page and chooses the next action; agent-browser executes it. Keep planning, authorization, text composition and final acceptance with the caller. Use a direct browser command when the control is already known.

## Setup

Resolve scripts relative to this skill directory. Run `node scripts/setup.mjs` once; it installs dependencies, reuses agent-browser or installs a local copy, and prompts for an OpenRouter API key with input hidden. An existing `OPENROUTER_API_KEY` or saved key skips the prompt. Never request a key in chat. Select an existing agent-browser executable with `--binary /path/to/agent-browser` when needed. See [README](README.md#install).

## Delegate a goal

```sh
node /path/to/skill/scripts/run.mjs --session current-session \
  --intent "Configure the requested report and save it as a draft. Finish on the report list." \
  --value 'name=Weekly operations'
```

Use the existing authenticated session. Optional `--url https://example.com` opens a caller-supplied starting URL in the same invocation. Login, credentials and OTPs remain with agent-browser's authentication provider, outside model input. Resolve the saved binary via `configuredBrowser()` from `scripts/config.mjs` for direct browser operations; never print the raw configuration.

Delegate the coherent goal once instead of splitting it into individual clicks. Supply all known field values up front. The helper is non-interactive: it reads command arguments and returns one JSON result on stdout. Do not create task, policy, result or evidence files. Existing project permissions and privacy rules still apply. For least privilege, repeat `--allow operation` or `--allow 'operation:Exact accessible name'`; when any rule is supplied, other browser gestures are withheld. See [agent invocation contract](references/usage.md).

## Read the result

The command returns `returnReason`, the final `observation`, missing input, a compact action trace, timings, charges and, when needed, an opaque `resumeToken`.

- Evaluate the returned page against the requested outcome. `reported_complete` is the model's assessment, not proof. A fresh, untruncated observation can supply the evidence without another tool call. Re-observe when the page changed after the call, evidence is missing, the result says `fresh:false`, or the task requires a separate authoritative readback. Do not reopen a dialog just to reconfirm a value already established by the returned page.
- Autocomplete text is a search query, not a committed selection. Click the matching accessible suggestion and check the selected value before continuing. The helper withholds arrow/Enter selection from autocomplete fields because similar options can commit the wrong record. Use direct caller control for keyboard-only dropdowns and verify the committed selection. Tab is not offered.
- `input_required` identifies a field whose exact value is missing. Supply it from user instructions or authorized caller work, then resume. Do not invent missing user facts.
- A handoff or limit means completion was not established. Preserve that result. If later caller work completes the task, distinguish it from the helper's result. An absent target remains a handoff even when stopping was correct.
- An uncertain gesture may already have happened. Observe before deciding what to do next; never blindly repeat it.

## Continue the same task

```sh
node /path/to/skill/scripts/run.mjs --resume-token "$RESUME_TOKEN" \
  --value 'Report name=Weekly operations'
```

Resume preserves the original session, binary, action allowlist, goal, completed intents and recent actions. It always observes again and chooses new controls. It does not replay stored references. After caller intervention, add `--context "Dismissed the account notice; continue from the current page"`. Do not pass the starting URL again. The token is encrypted, authenticated, expires after 30 minutes and is valid only with the same configured OpenRouter key. Treat it as private task state; do not log or publish it.

Defaults: 30 actions, 60 decisions, 120 seconds per invocation. Override with `--max-actions` and `--timeout` (milliseconds). Clicks, literal fills, native selects, observed native date segments with a supplied ISO date, checkbox check/uncheck, exact-path file uploads, contextual hover, page scrolling, Enter for ordinary text/search submission, Escape, back and brief waits are supported. Upload only when the user requested it and supplied the exact absolute path. Repeated waits on an unchanged page stop being offered after five attempts. Downloads, authentication, keyboard-only pickers, visual-only widgets and tab management remain direct agent-browser work. Keep the session exclusive during each call; the process-local lock cannot exclude people or other processes.

## Validation

`npm test` runs offline regressions. `npm run gym -- --output /absolute/path/to/new-gym.json` runs the fixed local suites, including the 26-case component matrix. `npm run gym:components -- --output /absolute/path/to/new-components.json` isolates that matrix; see its [coverage and source inventories](references/component-gym.md). `npm run gym:generated -- --output /absolute/path/to/new-generated.json --seed 1234 --cases 3` gives an isolated caller seeded multi-page travel goals and independently checks the saved outcome. `npm run benchmark:projects -- --competitor-dir /path/to/forvela/jev-agent-browser --output /absolute/path/to/new-report.json` runs the controlled same-provider, same-browser comparison. `npm run benchmark:codex -- --suite workflow --output /absolute/path/to/new-comparison.json` compares isolated Codex sessions driving agent-browser directly with sessions using the helper. See [benchmarks and limits](references/benchmarks.md).
