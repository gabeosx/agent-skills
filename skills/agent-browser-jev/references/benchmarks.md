# Codex with Jev versus Codex with agent-browser directly

This comparison measures the two actual ways to do browser work:

- **Direct:** Codex reads agent-browser snapshots, chooses controls, and issues normal agent-browser commands.
- **Jev:** Codex opens the page, calls the Jev helper with the task, and checks the resulting page. Codex can continue directly if Jev hands back control.

Both arms use actual Codex CLI sessions with **GPT-5.5, low reasoning effort**, the same browser executable, the same tasks and the same independent outcome checks. This is not a GPT API adapter inside the Jev action loop. Cost is not compared.

## Results

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

[Full comparison report](evidence/codex-comparison.json) contains every trial, source hashes, prompts, sanitized command logs, independent UI evidence and cleanup. All recorded source hashes match the shipped files. Direct-arm logs contain no helper calls; the Jev arm called the helper once for each of its 18 tasks.

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

The report records the exact prompts, sanitized command logs, every task outcome, wall-clock timing, versions, source hashes and cleanup. It omits model reasoning and token/cost accounting. The test closes its own browser sessions and servers and removes its Codex working directories. The helper's ordinary private evidence files can be retained for further inspection or removed after reviewing them.

`npm test` runs 30 offline regressions, including setup, hidden key entry, credential precedence, automatic browser installation, permissive CLI invocation, explicit policy handling and bounded execution. `npm run benchmark -- --output /absolute/path/to/new-report.json` remains available as a helper-only live acceptance run; it is not the Codex comparison and its timer excludes caller orchestration.
