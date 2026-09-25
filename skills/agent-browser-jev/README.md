# Agent Browser Jev

A small browser helper for agents that already use [agent-browser](https://github.com/vercel-labs/agent-browser). Give it a goal such as “set up this report and leave it as a draft.” Jev chooses the next control on each page, and agent-browser performs the action. Your agent supplies the goal and any exact text, then checks the result.

This is useful when a task takes several browser steps. For a button or field your agent can already identify, a direct agent-browser command is simpler.

## Install

You need Node.js 24 or newer, npm, and an [OpenRouter API key](https://openrouter.ai/settings/keys) with credit. If you already have a compatible agent-browser installation, the helper itself also runs on Node.js 20.3 or newer.

```sh
npx skills add gabeosx/agent-skills --skill agent-browser-jev --global
node "$HOME/.agents/skills/agent-browser-jev/scripts/setup.mjs"
```

Choose your agent when the installer asks. For unattended Codex installation, add `--agent codex --yes` to the first command. If the installer prints a different skill path, use that path for setup.

Setup installs the helper's dependencies and finds agent-browser, or installs a local copy if needed. It asks for your OpenRouter key in a hidden terminal prompt. If `OPENROUTER_API_KEY` is already set, setup uses it without saving another copy. Otherwise it stores the key in an owner-readable configuration file. Do not paste a key into a chat or command argument.

Once setup finishes, ask your agent something like:

> Use agent-browser-jev to set up a weekly report for Project Atlas. Save a draft, return to the report list, and check that the draft is there. Do not publish it.

The agent uses its current authenticated browser session and invokes the bundled helper directly. There are no task, policy, result or evidence files to manage.

## Why use it?

A browser task can turn into many rounds of “read the page, choose a control, click, read again.” This helper runs that loop inside one call. It uses controls observed on the current page; it does not generate JavaScript or rely on a saved click sequence. It returns the final page and a trace, so the calling agent can check what happened.

In one local 12-action report task, Codex using the helper finished in a median **15.9 seconds**, versus **69.6 seconds** with Codex driving agent-browser directly. Both completed all three trials. That is one synthetic workflow, not a promise of a 4.4× speedup on other websites. In a separate set of six shorter tasks, the assisted arm was only modestly faster and missed two strict final-screen checks. [Methods, costs, failures and raw results](references/benchmarks.md) are available for inspection.

The 1.0 release gym passed **52/52** independently checked outcomes, including safe handoffs, and three newly generated travel challenges passed **3/3** hidden-answer checks. A controlled same-provider component round passed **26/26**, versus **11/26** for one pinned compatible project. These are synthetic functional results, not proof of universal reliability or an ecosystem ranking.

The helper is most promising when it can handle a whole run of routine controls. Its advantage shrinks when a task needs only one or two obvious actions, or when the caller must repeatedly take over to resolve a difficult widget.

## How the agent invokes it

You normally ask your agent to use the skill; this command is the internal contract the skill follows:

```sh
node "$HOME/.agents/skills/agent-browser-jev/scripts/run.mjs" \
  --session reports \
  --url https://example.com/reports \
  --intent "Create a weekly report draft named Weekly operations and return to the list. Do not publish." \
  --value 'name=Weekly operations'
```

Omit `--url` to continue from the current page in that session. Supply every known text value with `--value`; Jev chooses a field but cannot invent or rewrite your text. Login, passwords and one-time codes stay with your existing browser setup.

A run returns one JSON object directly on stdout. It can report `reported_complete`, `input_required`, or a handoff such as `action_budget`. Completion is Jev's assessment; your agent still checks the returned page. If it needs to continue, the result contains an encrypted, short-lived `resumeToken`:

```sh
node "$HOME/.agents/skills/agent-browser-jev/scripts/run.mjs" \
  --resume-token "$RESUME_TOKEN" \
  --value 'name=Weekly operations'
```

Resuming observes the page again and never replays old element references. The token holds the continuation state, so no result file or resident server is needed. [The agent invocation contract](references/usage.md) covers the returned fields and least-privilege action limits.

## What it can and cannot do

It handles clicks, exact text entry, native dropdowns, native date inputs when you supply an ISO date such as `2026-11-08`, checkboxes, exact-path file uploads, contextual hover, page scrolling, back navigation, short waits, ordinary text/search submission with Enter, and Escape. It can pause for a missing value and resume. An upload is offered only for a grounded file control and a caller-supplied absolute path; do not supply a file the user did not authorize. Downloads, tab management, keyboard-only pickers, visual-only widgets and authentication remain with the caller and agent-browser.

Searchable dropdowns need special care: typing a name filters the list; it does not select a record. The helper can click accessible suggestions, but it deliberately withholds arrow/Enter selection from autocomplete fields because keyboard-only pickers have committed the wrong similar record in testing. Check the committed choice before any consequential action, and take over directly for a keyboard-only picker.

The seeded travel gym exposed a native-date failure: browser `fill` reported success on date segments without changing the input. The helper now uses observed Month, Day and Year controls with the supplied ISO date and stops offering waits on an unchanged page. The previously failing seed and a text-date seed both passed on final replay. [Original failure and corrected runs](references/benchmarks.md#seeded-travel-challenge) remain available; this does not establish that every date widget works.

By default the helper can use every supported browser action, including buttons that may save or submit. Your agent remains responsible for authorization and checking outcomes. It can narrow a task with repeated rules such as `--allow 'click:Save draft'` and `--allow 'fill:Report name'`; once any rule is present, unmatched gestures are not offered to Jev. Visible page text goes through OpenRouter. Do not put secrets in task values, do not publish resume tokens, and use the same session exclusively while a run is active.

## Measure it yourself

The local gym runs real Jev and agent-browser against disposable pages with independent checks. It reports outcomes, helper time, action count and Jev's reported charge for multi-screen work, autocomplete, negative targets and other awkward controls. Its component matrix adds 26 common patterns selected from WAI-ARIA APG and current Base UI, Radix, MUI and shadcn catalogs:

```sh
cd "$HOME/.agents/skills/agent-browser-jev"
npm run gym -- --output /absolute/path/to/new-gym.json --rounds 2
```

Run only the component matrix, or a comma-separated subset, while iterating:

```sh
npm run gym:components -- --output /absolute/path/to/new-components.json
npm run gym:components -- --output /absolute/path/to/new-subset.json \
  --cases command-palette,tree-view,file-upload,hover-card
```

The matrix covers accordions, tabs, menus and submenus, dialogs, switches, custom and multi-selects, pagination, sortable tables, trees, command palettes, popovers, steppers, drawers, carousels, delayed feedback, numeric inputs, file upload, hover cards and selection controls. The absent-target case must hand back without an unintended action. A positive case passes only when server-side state and the final accessibility snapshot agree; see the [coverage and source inventories](references/component-gym.md).

For a harder end-to-end check, generate a fake travel-booking task and give its goal, exact field values and starting page to an isolated Codex caller. Jev must navigate airport suggestions, near-matching flights, a long traveler form, conditional baggage and review. The fixture checks the saved selections and completed hold against a hidden answer key. Supply a seed to replay a failure; omit it to generate a new one:

```sh
npm run gym:generated -- --output /absolute/path/to/new-generated.json --seed 1234 --cases 3
```

This is a challenge runner, not a proof that Jev works on every website. The caller may inspect the result but cannot finish the task with direct browser gestures, so a pass means Jev actually reached the goal. Each report separates whole-task time and caller tokens from Jev's reported charge. Failed outcomes remain in the report.

For a controlled project comparison, check out [forvela/jev-agent-browser](https://github.com/forvela/jev-agent-browser), install its dependencies, and run `npm run benchmark:projects -- --competitor-dir /path/to/checkout --output /absolute/path/to/new-report.json`. The runner alternates order while holding the OpenRouter endpoint, Jev model, agent-browser runtime, goals, pages and hidden checks constant. It is a synthetic functional comparison, not a general project ranking. To compare Codex driving the same browser directly with Codex using Jev, use `npm run benchmark:codex -- --suite workflow --output /absolute/path/to/new-comparison.json`. Read the [benchmark notes](references/benchmarks.md) before comparing numbers from different workloads.

Other open-source Jev browser projects offer different strengths. The controlled component comparison covers one same-stack rival; it does not establish that this helper is fastest or most reliable across the ecosystem. [What the alternatives currently offer](references/published-evidence.md) explains where this skill fits.

## Setup notes

- To choose an existing agent-browser executable, run setup with `--binary /absolute/path/to/agent-browser` or set `AGENT_BROWSER_BINARY`. Its sessions and authentication remain yours.
- To change a saved key, rerun setup with `--change-key`. A secret manager can provide `OPENROUTER_API_KEY` or pipe the key to `--key-stdin`.
- For a project-only install, omit `--global` and run setup from the installed project skill path.
- After updating the skill, rerun setup to refresh dependencies. Restart the agent session if it has not discovered the update.
- `npm test` runs the offline regressions. The gym and comparison commands make live model calls and need a working browser.
