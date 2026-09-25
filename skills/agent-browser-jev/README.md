# Agent Browser Jev

**Give your AI agent a browser task. Let Jev handle the clicks.**

This skill adds a browser-control loop to [agent-browser](https://github.com/vercel-labs/agent-browser). Your agent gives it a task such as “open the Returns article and go back” or “fill this form but don't submit it.” Jev reads the page, chooses controls, and performs the steps in the existing browser session.

Your agent gets the result back in one call instead of deciding every click itself. It works across applications; it contains no website-specific workflows.

## Install and set up

You need **Node.js 20.3+**, npm, and an **OpenRouter API key**.

1. [Create an OpenRouter key](https://openrouter.ai/settings/keys) and [add credit](https://openrouter.ai/settings/credits). Jev runs through OpenRouter; an OpenAI or Anthropic key won't work here.
2. Install the skill and run setup:

   ```sh
   npx skills add gabeosx/agent-skills --skill agent-browser-jev --global
   node "$HOME/.agents/skills/agent-browser-jev/scripts/setup.mjs"
   ```

   Choose your agent when the installer asks. For a non-interactive Codex install, add `--agent codex --yes` to the first command. If your installer reports a different directory, use that directory for the setup command.
3. Paste your API key into the **hidden terminal prompt**. Setup installs the helper's dependencies and reuses agent-browser from your PATH. If it isn't installed, setup installs a local copy and downloads its browser.

That's it. Ask your agent:

> Use agent-browser-jev to open the Returns article in our current browser session, then go back to the list.

The key is saved locally in `~/.config/agent-browser-jev/config.json` with owner-only file permissions. `XDG_CONFIG_HOME` changes that directory. If you already supply `OPENROUTER_API_KEY` through your environment or secret manager, setup uses it without prompting or saving it; it takes precedence over a saved key. Paste keys into the terminal, not into chat.

**Already using a fork or credential provider?** Keep it. Run setup with `--binary /absolute/path/to/agent-browser`, or set `AGENT_BROWSER_BINARY`. Login, browser sessions and credential providers stay with agent-browser. To change a saved key later, rerun setup with `--change-key`.

For a project-local install, omit `--global` and run `node .agents/skills/agent-browser-jev/scripts/setup.mjs`. After updating the skill, rerun setup to refresh its dependencies. If the skill does not appear immediately, restart your agent session. [Skills installation options](https://github.com/vercel-labs/skills#readme).

## Use it

Usually, just ask your agent to use the skill. Some examples:

- “Search for account recovery, open the matching help topic, then return to the results.”
- “Fill the support form with this subject and message. Leave it as a draft.”
- “Open notification settings, enable email updates, and save.”

The agent opens the website and handles login through agent-browser as usual. Jev handles a short task within that session. It returns control when it finishes, cannot find the target, or reaches its execution limit.

You can also call it directly against an already-open session:

```sh
node "$HOME/.agents/skills/agent-browser-jev/scripts/run.mjs" \
  --session default \
  --intent "Open the Returns article, then go back to the list"
```

For exact text entry, supply the values separately:

```sh
node "$HOME/.agents/skills/agent-browser-jev/scripts/run.mjs" \
  --session support \
  --intent "Fill Subject and Message with the supplied values. Do not send." \
  --value 'subject=Delivery question' \
  --value 'message=Please check order #42.'
```

No task file or policy module is required. The command prints a result summary and the path to its saved evidence. `reported_complete` means Jev believes it finished; your agent can inspect the final page to confirm. A `handoff` means control returned without establishing completion, including when the target is absent. The caller preserves that result unless later work completes the goal.

## Why use it?

Ordinary agent-driven browsing often repeats the same cycle: read a page, decide a click, call a tool, and read again. Each cycle involves the main agent even when the task is small.

This skill lets Jev handle those short loops. The main agent keeps the overall task; Jev chooses from controls that actually exist on the current page; agent-browser executes them. That is useful for repeated button labels, dialogs, short forms and searches where you know the goal but don't want to maintain a fixed selector sequence.

The goal is fewer trips through the main agent for small UI tasks. [Published integrations and the design lessons we applied](references/published-evidence.md) explain why this division of work is useful. The fresh comparison below measures whether that saves time while completing the same work. A direct agent-browser command is still simpler when you already know exactly which control to use.

## Codex comparison

**Actual Codex on both sides: GPT-5.5, low reasoning effort.** Fresh run on 2026-09-25 (UTC), using agent-browser 0.38.1 and Chrome for Testing 151.0.7922.71. Six generic tasks, three trials per task per mode. Times include Codex reasoning, tool calls, navigation and final page checks.

| Task | Codex + agent-browser | Codex + Jev | Strict checks: direct / Jev |
| --- | ---: | ---: | ---: |
| Open Returns article and go back | 20.3 s | 18.4 s | 3/3 / 3/3 |
| Choose Warranty after articles reorder | 19.6 s | 15.4 s | 3/3 / 3/3 |
| Fill two fields without sending | 24.2 s | 21.5 s | 3/3 / 3/3 |
| Open settings, enable email and save | 19.7 s | 21.5 s | 3/3 / 1/3 |
| Search, open matching result and return | 21.6 s | 18.3 s | 3/3 / 3/3 |
| Return when the requested article is absent | 8.4 s | 17.6 s | 3/3 / 3/3 |

Across all 18 trials per mode, median elapsed time was **20.0 seconds directly versus 17.9 seconds with Jev**: **10.5% less time** in this sample. Summed task time fell 5.9%; the median is not the total runtime. All six missing-target checks passed after the caller handoff correction.

**Strict checks: 18/18 direct, 16/18 with Jev.** In the two failures, Jev enabled and saved email updates correctly; Codex then reopened the dialog to inspect the checkbox and left it open. The expected final screen/interaction checks failed. These failures remain in the report, so this is not a claim of perfect or superior end-to-end reliability.

**Cost and overhead:** GPT usage plus reported Jev charges corresponds to about **$2.07 direct versus $1.75 with Jev** across the 18 tasks, using standard API-equivalent rates. That is an estimate, not a Codex subscription bill. Jev itself reported **$0.00203 total**. Its median helper loop took **0.88 seconds**; 95.5% of the assisted run's summed task time was outside that loop, including navigation, caller orchestration, benchmark reporting and final checks.

Initial Codex startup and independent harness verification are excluded from timings; initial context is included in token usage. The earlier run and interrupted Chrome 154 attempts are retained. [Exact method, token categories, pricing assumptions, every trial and reproduction](references/benchmarks.md).

## Defaults

The default is permissive: Jev can choose any supported click or fill on the observed page, and visible page text goes to Jev without automatic redaction. Your agent's task and permissions remain the authority. There is no built-in read-only filter or extra confirmation prompt.

Text entry uses your exact supplied values. The helper allows up to **8 actions, 16 decisions and 60 seconds** per call, then returns control. It saves observations and action results in a new private temporary file. It does not automatically retry uncertain gestures or switch to another model.

For restricted or sensitive workflows, you can provide `--policy` with your own permissions and redaction. Existing task-file integrations still work. See [advanced configuration and the JavaScript API](references/usage.md).

## Troubleshooting and limits

| Situation | Next step |
| --- | --- |
| Missing dependency or API key | Rerun `scripts/setup.mjs`. |
| API access fails | Check your [OpenRouter key](https://openrouter.ai/settings/keys), credit and access to `typesafe/jev-1.13`. Setup checks local configuration; a real task checks API access. |
| Wrong browser/session | Pass `--binary` and `--session` explicitly. |
| `handoff` or an execution limit | Let the calling agent inspect the page and continue. |
| An action's outcome is uncertain | Check the page before repeating it. |
| Browser commands stall | Check the Chrome build as well as the CLI version. Our follow-up uses Chrome for Testing 151.0.7922.71; local Chrome 154 sessions stalled. Select an existing working browser with `AGENT_BROWSER_EXECUTABLE_PATH=/absolute/path/to/chrome`. |
| Browser installation fails on Linux | Follow [agent-browser's Linux setup](https://github.com/vercel-labs/agent-browser#linux-dependencies). |

The helper currently supports clicks, exact text fills and brief waits. Navigation, login, uploads and downloads use ordinary agent-browser commands. This is a general-purpose control helper, not a guarantee that every website or model decision will work.

**Version 0.2.1.** Tested on macOS; offline CI covers Linux with Node 20.3.0 and 24. Windows is not validated. Run `npm test` in the skill directory for the offline regression suite (Python 3 is used only by the terminal-prompt test), or `npm run benchmark:codex -- --output /absolute/path/to/new-report.json` for the live Codex comparison. Live runs use your OpenRouter credit.
