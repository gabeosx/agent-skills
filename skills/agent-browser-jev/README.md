# Agent Browser Jev

**Give your agent the goal. Let Jev handle the browser steps.**

Open a report, choose filters, fill fields, save a draft and return to the list—all through one helper call. Jev reads each new screen and chooses the next control. Your main agent handles the task and checks the returned result, without taking a turn for every click.

Built on [agent-browser](https://github.com/vercel-labs/agent-browser). Keep your browser sessions, login setup and credential providers. No website-specific scripts, new browser engine or second planning agent.

**Fresh benchmark: 4.4× faster, with 78% lower estimated model cost** on a 12-action report workflow. Both approaches passed all three trials. Actual Codex + agent-browser versus actual Codex + this skill. [Results and limits](#measured-performance).

## Install and set up

You need **Node.js 24+**, npm, and an **OpenRouter API key with credit**. The helper also supports Node 20.3+ when reusing a compatible existing agent-browser binary.

```sh
npx skills add gabeosx/agent-skills --skill agent-browser-jev --global
node "$HOME/.agents/skills/agent-browser-jev/scripts/setup.mjs"
```

Choose your agent when prompted. For a non-interactive Codex install, add `--agent codex --yes` to the first command. Use the path printed by the installer if it differs.

Setup installs dependencies, finds agent-browser or installs a local copy with Chrome, and asks for your API key in a **hidden terminal prompt**. [Create a key](https://openrouter.ai/settings/keys) · [Add credit](https://openrouter.ai/settings/credits). An OpenAI or Anthropic key will not work here.

Then ask your agent:

> Use agent-browser-jev to configure the report with these settings, save it as a draft, and return to the report list. Do not publish it.

**That's the normal workflow.** Your agent reads the skill and invokes the helper. You don't need to write a task file or a policy module.

<details>
<summary>Existing browser forks, credentials, project installs and updates</summary>

- Keep a fork or credential provider: run setup with `--binary /absolute/path/to/agent-browser`, or set `AGENT_BROWSER_BINARY`. This does not replace its authentication configuration.
- Already supply `OPENROUTER_API_KEY` through an environment or secret manager? Setup uses it without prompting or saving it. Otherwise the key is saved in `~/.config/agent-browser-jev/config.json` with owner-only permissions. `XDG_CONFIG_HOME` changes that location. Never put keys in chat.
- Change a saved key: rerun setup with `--change-key`. For non-interactive secret-provider input, use `--key-stdin`.
- Project install: omit `--global`; run `node .agents/skills/agent-browser-jev/scripts/setup.mjs`.
- After updating the skill, rerun setup to refresh dependencies. Restart the agent session if the new skill is not discovered.
- The skill uses the Node runtime and agent-browser; it does not install a separate Playwright or Puppeteer stack.

</details>

## Why use it?

The expensive part of agent-driven browsing is often the repeated conversation around simple UI work: inspect, decide, invoke a tool, inspect again. This skill keeps that loop inside a small controller.

- **Delegate the whole browser subtask.** Jev follows a goal across screens, without a parent-model turn per action.
- **Keep the browser you already use.** Existing agent-browser sessions, forks and authentication continue to work.
- **Use live controls.** Targets come from the current accessibility snapshot, including context that distinguishes repeated labels. Searchable dropdowns require selecting a suggestion after typing. The helper can click observed options; keyboard-only selection currently needs direct caller control and verification. There are no hard-coded site selectors or click sequences.
- **Receive useful evidence immediately.** The response includes the final page, freshness/truncation flags, missing input, elapsed times and reported Jev charges. Your agent can evaluate the result without reading another file.
- **Resume instead of restarting.** Missing a field value or reaching a limit returns a continuation. Supply the value or let the caller help, then continue with fresh controls and retained progress.

A direct agent-browser command remains useful when you already know the control. This skill helps when reaching the goal would otherwise require repeated model decisions.

## Measured performance

Measured with **v0.3.0 on 2026-09-25**, using actual **Codex GPT-5.5 with low reasoning effort** in both arms. The task creates a report draft across several screens: text entry, three dropdowns, two checkbox settings, review, save and return to the list. Twelve browser actions; no supplied selectors or expected action sequence.

| Three trials per approach | Codex + agent-browser | Codex + Jev |
| --- | ---: | ---: |
| Median complete-task time | 69.6 s | **15.9 s** |
| Independently verified outcomes | 3/3 | **3/3** |
| Median caller shell commands, including benchmark reporting | 22 | **4** |
| Estimated model cost, all three trials | $1.606 | **$0.346** |

That's **77% less elapsed time (4.4× faster)** and **78% lower estimated model cost** in this sample. Jev's own reported charges totaled **$0.00263** across the three assisted tasks; the cost column also includes the calling GPT model.

Timing includes navigation, Codex/model orchestration, browser actions and caller acceptance. Cost uses standard API-equivalent GPT rates with cached input counted correctly; it is **not a Codex subscription bill**. Both arms used the same agent-browser 0.33.2 fork and Chrome 151. Separate live acceptance checks cover the upstream version used by setup.

This is one synthetic workflow with three trials per approach, not an arbitrary-site reliability claim. All runs and failures are retained. [Raw comparison](references/evidence/codex-workflow-0.3.0.json) · [Metrics and cost assumptions](references/evidence/workflow-metrics-0.3.0.json) · [Full methodology, development failures and prior short-task results](references/benchmarks.md).

The v0.3.1 autocomplete checks found a remaining limitation: Jev can issue keyboard actions but sometimes commits the wrong suggestion and reports completion. Use direct agent-browser for keyboard-only dropdowns, and verify selected values before consequential actions. [Autocomplete results and retained failures](references/benchmarks.md#v031-searchable-dropdowns).

## Command-line examples

Usually, let your agent invoke the skill. These commands are useful for integrations and reproducible tasks.

### One goal, one invocation

```sh
node "$HOME/.agents/skills/agent-browser-jev/scripts/run.mjs" \
  --session reports \
  --url https://example.com/reports \
  --intent "Create the requested report, save a draft and return to the list. Do not publish." \
  --value 'name=Weekly operations'
```

Omit `--url` to continue on the session's current page. Authenticate with agent-browser first when needed. Credentials and OTPs stay with its authentication provider.

### Supply exact text

```sh
node "$HOME/.agents/skills/agent-browser-jev/scripts/run.mjs" \
  --session support \
  --intent "Fill Subject and Message with the supplied values. Leave the form as a draft." \
  --value 'subject=Delivery question' \
  --value 'message=Please check order #42.'
```

Jev chooses where to put those literal values; it cannot rewrite them. Compose text in the calling agent and supply it here.

### Continue after missing input or a limit

The first call prints its private evidence path. Resume using that path:

```sh
node "$HOME/.agents/skills/agent-browser-jev/scripts/run.mjs" \
  --resume /path/to/result.json \
  --value 'Report name=Weekly operations'
```

After caller intervention, add context such as `--context "Dismissed the welcome notice"`. Resume retains the original browser, policy, goal, completed intents and recent actions. It observes the page again; it does not replay saved element references or reopen the starting URL.

## Supported controls

| Inside the Jev loop | Keep with the caller / agent-browser |
| --- | --- |
| Clicks, exact text fills, native dropdown selections | Login, passwords and OTPs |
| Explicit checkbox check/uncheck | Text composition and missing user facts |
| Page scrolling, Enter, Escape, ArrowDown/Up | Uploads, downloads and tab management |
| Back navigation, brief waits | Visual-only widgets and unsupported interactions |
| Missing-input requests and resumable handoffs | Business decisions, permissions and final acceptance |

Defaults allow **30 actions, 60 decisions and 120 seconds** per invocation. Change them with `--max-actions 50 --timeout 180000`. The default policy permits supported controls; it is not read-only. Existing user and project authorization still apply. Integrations can reuse a privacy/permission policy via `--policy` without changing the loop.

## Understanding the result

`reported_complete` means Jev believes the goal is satisfied. The caller checks the returned page against the requested outcome. It is not independently verified business success.

`input_required` identifies missing exact text. A `handoff`, limit or error means completion was not established. Later caller recovery is a separate outcome. If a browser action has an uncertain result, inspect the current page before retrying it.

A returned observation marked fresh was captured after the helper's last action; it cannot guarantee the page stayed unchanged after the call. Truncated or stale evidence, external activity, and tasks needing authoritative readback call for an additional check. Don't reopen a dialog merely to verify information already visible in the result.

Visible page text is sent to Jev through OpenRouter. Evidence and continuation files can contain page content and supplied values; they are created with owner-only permissions. The caller keeps the browser session exclusive. Arbitrary websites, complex widgets, frames, human interference and long-running reliability are not universally covered by the published tests. Oversized observations or action menus return a limit rather than silently discarding controls.

[CLI, API, policies and result fields](references/usage.md) · [Benchmarks and reproduction](references/benchmarks.md) · [Source and design research](references/published-evidence.md)

## Development

```sh
npm ci
npm test
npm run test:workflow -- --output /absolute/path/to/new-report.json
npm run benchmark:codex -- --suite workflow --output /absolute/path/to/new-comparison.json
```

The last two commands use real Jev/browser calls. The comparison also invokes your Codex CLI account. Reports preserve failures and include cleanup status; use a new output path for each run.
