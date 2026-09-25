---
name: agent-browser-jev
description: Use Jev to ground bounded natural-language browser actions against current agent-browser controls, execute them in an existing session, and return observed progress. Use for short UI tasks where interpreting labels or repeated controls would otherwise require per-click agent decisions.
metadata:
  version: "0.1.0"
---

# Agent Browser Jev

Use the bundled helper for a bounded browser intent or short set of caller intents. The caller owns the task, permissions, literal values and final acceptance; Jev interprets the current accessibility snapshot and chooses an offered action, wait, completion or handoff. The existing agent-browser executes it.

Prefer a direct agent-browser command when the current reference is already known. This skill adds value when interpreting the UI saves repeated caller decisions. It does not choose business treatment or replace a site's API/connector policy.

## Use

1. Continue in the user's selected agent-browser session and binary/fork. Follow existing project policy, tenant/account binding and exclusive-session arrangements. For setup or direct commands, load that binary's `skills get core` guidance. Authentication stays with its existing credential provider, including Bitwarden when configured.
2. Supply a clear bounded intent, any exact non-secret text values, and the caller's actual authorization policy. Reuse existing project policy code. Permissions describe allowed effects; they do not prescribe the correct row or next action. If authority cannot be established, leave that action unavailable. A generic `click` verb does not establish authority.
3. Use the API or CLI in [references/usage.md](references/usage.md). Reuse the bundled implementation instead of writing a screen-specific runner. A short multi-action intent is supported; no permanent button sequence or row parser is needed.
4. Inspect returned actions and the latest observation. `reported_complete` records Jev's judgment, not verified task or business success. On handoff or a budget/error return, continue in the same caller with a fresh observation. An uncertain gesture may already have happened: inspect before retrying it.

Keep the session exclusive for the bounded task. The in-process lock cannot coordinate other processes or human browser activity. If the owner changes the session outside the helper, invalidate its observation as described in the API reference. Reference binding reduces stale-decision errors; it does not make a gesture atomic with observation.

## Dependencies and privacy

- Node.js 20.3+ and the existing `agent-browser` executable. Configure its path and session; the skill does not install or replace a browser, fork or credential plugin.
- Install the pinned JavaScript dependency once in this skill directory: `npm ci --ignore-scripts --no-audit --no-fund`.
- Use the caller's secret provider or an inherited `OPENROUTER_API_KEY`. Keep keys out of task files, skill files, command arguments and logs. Other projects do not need an accounting repository or its credential mapping.
- Supply a privacy filter before sending visible accessibility data to Jev. Reuse the project's sensitive-name/account redactions. Do not send credential-entry screens, passwords or OTPs; authenticate through the existing provider first. Intents and supplied values also reach the model, so keep secrets out of them.
- Store evidence privately. The CLI creates a new mode-600 evidence file and prints a summary; API callers own storage.

## Supported boundary

The helper offers clicks on ordinary semantic controls, fills using caller-supplied values, and a short wait. Unsupported actions return for caller continuation. It has no navigation planner, autocomplete engine, upload helper or accounting verifier. Use ordinary authorized agent-browser operations when those are needed.

Live acceptance covered supervised read-only statement-detail and matching-panel opening/closing in Xero. This establishes the loop on those screens, not arbitrary-site reliability or write safety. Fill literal preservation is mechanically tested; live forms and writes need task-appropriate authorization and acceptance. Business-specific readback stays with the caller.

Run `npm test` here after changing the helper. Tests cover binding, budgets, permissions, literal preservation, error handling and the portable command interface. No live browser or API key is needed for these tests.
