# Codex with Jev versus Codex with agent-browser directly

The original 0.2.0 measurements below remain unchanged. A follow-up with corrected handoff instructions is recorded separately; changed benchmark setup is not treated as a speed optimization of the runtime.

This comparison measures the two actual ways to do browser work:

- **Direct:** Codex reads agent-browser snapshots, chooses controls, and issues normal agent-browser commands.
- **Jev:** Codex opens the page, calls the Jev helper with the task, and checks the resulting page. Codex can continue directly if Jev hands back control.

Both arms use actual Codex CLI sessions with **GPT-5.5, low reasoning effort**, the same browser executable, the same tasks and the same independent outcome checks. This is not a GPT API adapter inside the Jev action loop. The original run did not capture token usage or compare cost.

## Original 0.2.0 results

- Run: 2026-09-25T03:44:00.601Z to 2026-09-25T03:50:10.031Z.
- Codex: codex-cli 0.147.0; model `gpt-5.5`; reasoning `low`.
- Browser: agent-browser 0.38.1; Node v26.5.0; darwin-arm64.

| Task | Codex + agent-browser | Codex + Jev | Checks passed: direct / Jev |
| --- | ---: | ---: | ---: |
| Open Returns article and go back | 17.6 s | 12.3 s | 3/3 / 3/3 |
| Choose Warranty after articles reorder | 16.9 s | 12.2 s | 3/3 / 3/3 |
| Fill two fields without sending | 21.5 s | 20.6 s | 3/3 / 3/3 |
| Open settings, enable email and save | 18.4 s | 14.3 s | 3/3 / 3/3 |
| Search, open matching result and return | 24.1 s | 14.4 s | 3/3 / 3/3 |
| Return when the requested article is absent | 7.9 s | 15.0 s | 2/3 / 0/3 |

The overall median across 18 trials per arm was 17.985 seconds direct and 14.3385 seconds with Jev, a 20.3% reduction in elapsed time in this sample. All timing samples, including status mismatches, are included. Summed per-task times were 337.591 seconds direct and 278.463 seconds with Jev; these sums are not the concurrent experiment's wall-clock duration.

Strict checks passed in **17/18 direct** and **15/18 Jev-assisted** trials. All 30 multi-action trials passed. Each of the six missing-article trials correctly left the page untouched, but Codex reported `complete` instead of the harness's expected `handoff` once in the direct arm and three times in the Jev arm. These are caller-status protocol mismatches, not wrong browser clicks. The original failed verdicts remain in the report. The task wording permits returning when the article is absent, so these status labels must be interpreted with that protocol distinction in mind; they do not establish a general model error rate.

[Full comparison report](evidence/codex-comparison.json) contains every trial, source hashes, prompts, sanitized command logs, independent UI evidence and cleanup. The recorded source hashes identify the 0.2.0 files used in that run; later fixes have different hashes. Direct-arm logs contain no helper calls; the Jev arm called the helper once for each of its 18 tasks.

[Supplemental helper outcomes](evidence/helper-outcomes.json) were collected from those actual CLI evidence files during final audit. They confirm all three missing-article calls returned `handoff` with zero actions. The caller changed the status label afterward. No cost fields or model reasoning are published. The 18 owned temporary helper-evidence directories were removed after collecting this evidence.

This supports using Jev to shorten these bounded multi-action tasks, while retaining caller verification. It does not support claiming equal end-to-end reliability or that Jev is always faster.

## Method

The six tasks use new synthetic help-center, support-form, preferences and search pages. Three paired rounds give 18 tasks per arm. Each round starts two fresh Codex sessions, one per arm. They run concurrently in separate browser sessions on the same host; task order rotates between rounds. Within a round, each Codex session handles six tasks. Neither session sees fixture source, expected refs, action sequences, other sessions or prior reports. Codex could load its installed skills as usual: the existing global helper guide was version 0.1.2, while the explicit command in the benchmark prompt selected the 0.2.0 runtime under test and its permissive CLI. That instruction context is a limitation when generalizing to fresh installations. Home-directory paths in command logs are redacted.

Timing begins when the harness delivers the next task to Codex and ends when Codex submits its assessment. It includes opening the page, Codex reasoning and tool orchestration, browser interaction, Jev calls where used, and Codex's final snapshot/value checks. Initial Codex process startup and the harness's independent verification are excluded. There is no subtraction of the caller's overhead from the Jev arm.

The direct arm uses ordinary `open`, `snapshot`, `click`, `fill`, `get` and `wait` commands, with batching when Codex chooses. It has no Jev dependency and does not call a separate GPT API. The Jev arm uses the installed production CLI with its default permissive policy and exact supplied values. Both agents receive a maximum of eight gestures per task and the same task authorization. The shared workflow requires a fresh final snapshot and field readbacks where relevant.

Every trial is retained, including failures and exception-handling time. No trial is automatically retried. Independent checks inspect browser-generated events, final snapshots and form values; Codex's completion claim is insufficient by itself. The absent-article case additionally checks whether the caller reported a handoff. A status-label mismatch is recorded separately from incorrect browser actions in the discussion below.

Six local tasks and three repeats per task are a small sample. These measurements do not establish a universal speedup or reliability rate across websites. Concurrent runs can share host/provider load. Model behavior, context growth, network latency and tool batching can affect timing.

## Reproduce

Install the skill and run setup as described in the [README](../README.md). The comparison also needs a signed-in Codex CLI with access to the chosen model. The recorded run uses Codex CLI 0.147.0 and upstream agent-browser 0.38.1 on macOS. Run from the installed skill directory:

```sh
npm run benchmark:codex -- --rounds 3 --output /absolute/path/to/new-comparison.json
```

Optional overrides: `--model gpt-5.5`, `--effort low`, `--binary /path/to/agent-browser`, and `--codex /path/to/codex`. The runner starts isolated Codex sessions with user configuration disabled, using the account's existing authentication. It gives them access to local synthetic pages and passes the configured OpenRouter key in the environment for the Jev arm. It does not place credentials in prompts or command arguments.

The current runner records exact prompts, sanitized command logs, every task outcome, wall-clock timing, versions, source hashes and cleanup. It also captures each Codex session's final usage object and each helper's result, decision charges and elapsed times. Usage covers the whole six-task session, including initial context and skill loading; it is not a per-task token allocation. Missing usage or charges remain unknown, never zero. Model reasoning is omitted. The test closes its own browser sessions and servers and removes its Codex working directories. The runner provides explicit evidence paths under its temporary directories and retains selected metrics before removing those files.

`npm test` runs 31 offline regressions, including setup, hidden key entry, credential precedence, automatic browser installation, permissive CLI invocation, explicit policy handling and bounded execution. `npm run benchmark -- --output /absolute/path/to/new-report.json` remains available as a helper-only live acceptance run; it is not the Codex comparison and its timer excludes caller orchestration.


## Handoff correction in 0.2.1

The caller instructions now distinguish a correct stop from accomplishing the requested browser outcome. The original helper result is preserved; completion after recovery must be supported by subsequent evidence.

Three fresh GPT-5.5 low-effort callers received the revised skill and the actual recorded missing-article results. All three returned `handoff` and described the absent article without claiming a click. [Prompts, answers and usage](evidence/handoff-caller-0.2.1.json). This is a focused caller-interpretation test, not a new browser timing comparison. Reproduce it with:

```sh
npm run test:caller -- --output /absolute/path/to/new-caller-report.json
```

The attempted full browser replays initially stalled with Chrome for Testing 154.0.8037.57. Concurrent, preflighted and serial configurations were tried; both upstream agent-browser 0.38.1 and a separate fork probe encountered stalled commands. The standalone helper run also stalled. [All three comparison attempts](evidence/browser-replay-attempts-0.2.1.json) and the [standalone attempt](evidence/helper-replay-chrome154.json) are retained. These incomplete diagnostics do not establish model speed or reliability rates. Forced cleanup targeted only the test sessions/processes.

An existing Chrome for Testing 151.0.7922.71 build passed a five-command open/snapshot/navigation probe. The follow-up comparison selects that executable through `AGENT_BROWSER_EXECUTABLE_PATH`, records its version, and otherwise retains agent-browser. No global browser configuration or shared browser cache was changed. This local build-dependent observation is not a diagnosis of every Chrome 154 installation.


## Fresh complete replay: 0.2.1

Run 2026-09-25T04:52:04.894Z–04:59:30.170Z. Same six tasks, three paired rounds, actual GPT-5.5 low-effort Codex CLI 0.147.0 sessions, agent-browser 0.38.1, and explicitly selected Chrome for Testing 151.0.7922.71. Both arms ran concurrently as before, with task order rotated. The helper arm read the matching 0.2.1 skill before task delivery. No browser preflight is included in this final configuration. The original Chrome build was not recorded in 0.2.0, so differences between releases are not attributed solely to the instruction fix.

| Task | Codex + agent-browser | Codex + Jev | Strict checks: direct / Jev |
| --- | ---: | ---: | ---: |
| Open Returns article and go back | 20.3 s | 18.4 s | 3/3 / 3/3 |
| Choose Warranty after articles reorder | 19.6 s | 15.4 s | 3/3 / 3/3 |
| Fill two fields without sending | 24.2 s | 21.5 s | 3/3 / 3/3 |
| Open settings, enable email and save | 19.7 s | 21.5 s | 3/3 / 1/3 |
| Search, open matching result and return | 21.6 s | 18.3 s | 3/3 / 3/3 |
| Return when the requested article is absent | 8.4 s | 17.6 s | 3/3 / 3/3 |

All six missing-target trials reported handoff and left the page untouched. Strict pass counts were 18/18 direct and 16/18 Jev-assisted. The two failures are the preferences task in rounds 2 and 3: helper evidence records the three intended actions and the saved-preferences screen, then caller command logs and page events show an additional open-settings click during verification. Email remained enabled, but the final dialog and event trace violate the existing strict checks. We retain those failures; satisfying the saved setting and satisfying every final-screen assertion are separate conclusions.

The median of all trial times is 19.999s direct and 17.900s assisted (10.5% less). Summed task times are 354.316s and 333.505s (5.9% less). Both include failed strict checks. Helper-loop median is 0.880s; its total is 15.124s, or 4.5% of assisted task time. The remainder includes browser navigation, Node startup, caller reasoning/tool orchestration, fixture reporting and final readbacks. It is not an isolated measurement of GPT inference latency.

[Raw trials, caller commands, helper outcomes and usage](evidence/codex-comparison-0.2.1.json). [Derived totals and estimate assumptions](evidence/comparison-metrics-0.2.1.json). All seven source hashes in this complete replay match the shipped sources. The report's overall verdict remains failed because of the two strict UI checks. All six browser sessions, servers, and temporary evidence directories closed successfully.

### Tokens and API-equivalent cost

| Category, total across three six-task sessions | Direct | With Jev |
| --- | ---: | ---: |
| GPT input tokens, including cached | 2,242,734 | 2,015,440 |
| GPT cached input, subset of input | 2,128,640 | 1,930,112 |
| GPT uncached input | 114,094 | 85,328 |
| GPT output, including reasoning | 14,574 | 11,882 |
| GPT reasoning output, subset of output | 483 | 562 |
| GPT cache-write tokens reported | 0 | 0 |
| GPT API-equivalent estimate | $2.072010 | $1.748156 |
| Jev reported charges | $0 | $0.002027466 |
| Combined model-cost estimate | $2.072010 | $1.750183466 |

The combined estimate is 15.5% lower in this sample. GPT input fell 10.1%, uncached input 25.2%, and output 18.5%. Counts cover the entire sessions, including instructions and skill loading; they are not per-task counts. The interrupted development runs and separate caller regression are excluded from both comparison arms, not treated as free.

Using [OpenAI's GPT-5.5 rates](https://developers.openai.com/api/docs/models/gpt-5.5), checked 2026-09-25, the formula is `(uncached_input × 5 + cached_input × 0.50 + output × 30) / 1,000,000`, plus reported Jev charges. This is a standard API-equivalent estimate; it does not estimate subscription limits, credits or the user's actual invoice. It assumes ordinary short-context pricing, without priority, regional or long-context premiums. The CLI session totals do not expose each request's context length. [Usage accounting](https://developers.openai.com/api/docs/guides/agents-api/observability) includes cached tokens in input and reasoning tokens in output; neither is added twice.

To choose an existing Chrome executable explicitly for reproduction:

```sh
AGENT_BROWSER_EXECUTABLE_PATH=/absolute/path/to/chrome \
  npm run benchmark:codex -- --rounds 3 --output /absolute/path/to/new-comparison.json
```

The executable's `--version` is recorded when that override is present. A matching CLI version alone does not establish a matching browser-engine build.
