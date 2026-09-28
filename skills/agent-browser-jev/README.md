# Agent Browser Jev

A small browser helper for agents that already use [agent-browser](https://github.com/vercel-labs/agent-browser). Give it a goal such as “set up this report and leave it as a draft.” Jev chooses the next control on each page, and agent-browser performs the action. Your agent supplies the goal and any exact text, then checks the result.

Licensed under the [MIT License](LICENSE).

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

Jev is most useful for routine work that spans several pages or controls. It keeps the observe → decide → act loop inside one bounded run, while the calling agent retains authorization and checks the final result. For a single obvious click or an unusual widget, use agent-browser directly.

The 1.0 release gym passed **52/52** checks, the generated travel challenge passed **3/3**, and the common-component matrix passed **26/26**. In the published 12-action report benchmark, the helper completed all three trials with a **15.9-second median**, compared with **69.6 seconds** for direct agent-browser control. [See the benchmark methods and raw results](references/benchmarks.md).

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

Very large pages receive a bounded fallback observation containing compact interactive controls at limited accessibility depth. If that still exceeds the model bound, the helper exposes a marked first window of complete interactive entries and only their matching browser-issued references. It never cuts a reference, retains metadata for an omitted control, exposes hidden DOM, or sends an oversized model request.

For goals that change site state, reaching a page or submitting a search is not treated as completion. The completion choice remains unavailable until a matching observed mutation control, such as Save, Post, Subscribe, or Upvote, has succeeded. The calling agent still checks the returned page and any authoritative result.

Forum-relative actions also retain their context. A request for the newest post must reach the named forum and its New ordering before an Upvote is available. When a new Subscribe must originate on a specified post but the forum is already subscribed, the helper can clear that state on the listing, open the required post, and treat only the subsequent Subscribe as completion evidence.

The seeded travel gym exposed a native-date failure: browser `fill` reported success on date segments without changing the input. The helper now uses observed Month, Day and Year controls with the supplied ISO date and stops offering waits on an unchanged page. The previously failing seed and a text-date seed both passed on final replay. [See the original failure and corrected runs](references/benchmarks.md#seeded-travel-challenge).

By default the helper can use every supported browser action, including buttons that may save or submit. Your agent remains responsible for authorization and checking outcomes. It can narrow a task with repeated rules such as `--allow 'click:Save draft'` and `--allow 'fill:Report name'`; once any rule is present, unmatched gestures are not offered to Jev. Visible page text goes through OpenRouter. Do not put secrets in task values, do not publish resume tokens, and use the same session exclusively while a run is active.

## Measure it yourself

The local gym runs real Jev and agent-browser against disposable pages with independent checks. It reports outcomes, helper time, action count and Jev's reported charge for multi-screen work, autocomplete, negative targets and other awkward controls. Its component matrix adds 28 common patterns selected from WAI-ARIA APG and current Base UI, Radix, MUI and shadcn catalogs:

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

The matrix covers accordions, tabs, menus and submenus, dialogs, switches, custom and multi-selects, similar-record autocomplete, pagination, sortable tables, trees, command palettes, popovers, steppers, drawers, carousels, delayed feedback, native dates, numeric inputs, file upload, hover cards and selection controls. The absent-target case must hand back without an unintended action. A positive case passes only when server-side state and the final accessibility snapshot agree; see the [coverage and source inventories](references/component-gym.md).

To measure a helper change, run a paired study against a separate baseline checkout. It alternates both helper versions on the same cases and seeded UI variations, records named verifier conditions and synthetic step traces, and reports paired wins and regressions:

```sh
npm run gym:study -- \
  --baseline-dir /absolute/path/to/baseline/skills/agent-browser-jev \
  --output /absolute/path/to/new-study.json
```

The [study workflow](references/study-gym.md) explains focused reruns, offline report comparison and cleanup. This lane uses the installed Node helper and agent-browser. It does not install BrowserGym or services on the host.

For genuinely independent tasks, the optional Docker-only [BrowserGym study](references/browsergym-study.md) runs baseline and candidate helpers on seeded MiniWoB tasks or a scoped WebArena-Verified cohort and uses official benchmark reward as the verifier. Its first integration check needs no API key:

```sh
npm run gym:browsergym -- --smoke --output /absolute/path/to/new-browsergym-smoke.json
```

Add `--headed` to watch the container's browser through a localhost viewer. The command prints its temporary URL and password; see the [BrowserGym study guide](references/browsergym-study.md) for a longer viewing pause and containment details.

For an extended, checkpointed study, `npm run gym:campaign` runs a curated MiniWoB, WebArena-Verified, or integration cohort one disposable Docker pair at a time. It keeps paired reports, source snapshots, a hash-chained event audit and configurable time/spend limits. `npm run gym:dashboard:service -- start --campaign-root /absolute/path/to/.runs` starts a persistent localhost dashboard showing stage, iteration, separate first-attempt/development/holdout score views, change impact, spend and progress. The dashboard ignores readiness records superseded by a newer campaign while promoting a genuinely newer preparation record for the next campaign. Failed tasks are not blindly retried: a new runtime source hash and a recorded change note are required, with at most three retries after the initial attempt. See the [campaign runbook](references/browsergym-campaign.md). The dashboard needs no database or installed host package.

Use `--suite integration` to select a separate set of three original BrowserGym-core multi-page tasks under the same Docker, audit, budget and dashboard controls. These are self-contained regression tests, not scores on another public BrowserGym benchmark; see the [study guide](references/browsergym-study.md) for what they verify.

Use `--suite webarena-verified` for the official BrowserGym WebArena-Verified adapter. The supported public Reddit development cohort is tasks `399`, `404`, `595`, and `650`; task `603` is separately predeclared as a one-attempt holdout whose intent remains unopened until development freezes. Retrieval tasks remain outside this browser-control helper's output contract. The runbook pins and scopes the official environment, requires both evaluator controls before paid work, and keeps hidden evaluator expectations out of model input.

For a harder end-to-end check, generate a fake travel-booking task and give its goal, exact field values and starting page to an isolated Codex caller. Jev must navigate airport suggestions, near-matching flights, a long traveler form, conditional baggage and review. The fixture checks the saved selections and completed hold against a hidden answer key. Supply a seed to replay a failure; omit it to generate a new one:

```sh
npm run gym:generated -- --output /absolute/path/to/new-generated.json --seed 1234 --cases 3
```

The caller may inspect the result but cannot finish the task with direct browser gestures, so the fixture attributes the browser outcome to Jev. Each report separates whole-task time and caller tokens from Jev's reported charge, and retains failed outcomes.

For a controlled project comparison, check out [forvela/jev-agent-browser](https://github.com/forvela/jev-agent-browser), install its dependencies, and run `npm run benchmark:projects -- --competitor-dir /path/to/checkout --output /absolute/path/to/new-report.json`. The runner alternates order while holding the OpenRouter endpoint, Jev model, agent-browser runtime, goals, pages and hidden checks constant. To compare Codex driving the same browser directly with Codex using Jev, use `npm run benchmark:codex -- --suite workflow --output /absolute/path/to/new-comparison.json`. The [benchmark notes](references/benchmarks.md) explain the workloads and measurements.

Other open-source Jev browser projects offer different runtimes, providers and interfaces. [See the project comparison](references/published-evidence.md) for the current feature differences and controlled component result.

## Setup notes

- To choose an existing agent-browser executable, run setup with `--binary /absolute/path/to/agent-browser` or set `AGENT_BROWSER_BINARY`. Its sessions and authentication remain yours.
- To change a saved key, rerun setup with `--change-key`. A secret manager can provide `OPENROUTER_API_KEY` or pipe the key to `--key-stdin`.
- For a project-only install, omit `--global` and run setup from the installed project skill path.
- After updating the skill, rerun setup to refresh dependencies. Restart the agent session if it has not discovered the update.
- `npm test` runs the offline regressions. The gym and comparison commands make live model calls and need a working browser.
