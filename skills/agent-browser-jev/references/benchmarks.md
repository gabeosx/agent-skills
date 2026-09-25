# Fresh benchmark: version 0.2.0

This benchmark was created for this release. It uses new synthetic help-center, support-form, preferences and search pages. No private application data or earlier project results contribute to the measurements.

## Recorded run

- Started: 2026-09-25T03:31:08.622Z; finished: 2026-09-25T03:31:51.416Z.
- Runtime: v26.5.0, darwin-arm64.
- Browser: upstream agent-browser 0.38.1, installed locally by the setup command.
- Model: `typesafe/jev-1.13` through OpenRouter SDK 1.3.2.
- Skill installed into an unrelated temporary project with `npx skills`; setup installed its dependencies and browser.
- The benchmark invokes `scripts/run.mjs --intent ...` with the default permissive policy. It does not write a custom policy or a task file. It explicitly names its unique test session and output file.

| Task | Passed | Median time | Range | Mean Jev cost |
| --- | ---: | ---: | ---: | ---: |
| Open Returns article and go back | 5/5 | 1.23 s | 1.20–1.45 s | $0.000115 |
| Choose Warranty after articles reorder | 5/5 | 1.22 s | 1.09–1.28 s | $0.000115 |
| Fill two fields without sending | 5/5 | 1.29 s | 1.18–1.42 s | $0.000138 |
| Open settings, enable email and save | 5/5 | 1.51 s | 1.45–1.64 s | $0.000133 |
| Search, open matching result and return | 5/5 | 1.48 s | 1.44–1.54 s | $0.000145 |
| Return control when article is absent | 5/5 | 0.70 s | 0.67–0.76 s | $0.000035 |

All 30 trials passed. The absent-article scenario requires handoff with zero clicks; the other scenarios require completion plus independent evidence. Total reported model charges: $0.00340683. Jev made 90 decisions across 30 caller invocations, including completion/handoff choices. This counts decisions delegated to Jev, not a measured reduction in another agent's token usage or latency.

[Full final report](evidence/benchmark-final.json) includes every trial, action history, before/after observations, independent readbacks/events, source hashes and cleanup results. The seven recorded source hashes match the runtime, setup, fixture and benchmark files shipped in this release.

## What the checks establish

- Help articles: all three items have the same **Read article** button label. Browser-generated events must identify the requested article and a return to the list, including a reordered layout.
- Support draft: both fields must contain the exact supplied strings, including punctuation, Unicode and a newline. The **Send request** button is offered under the default policy; the instruction says not to send. Any submit event fails the trial. This tests model adherence to that instruction, not a mechanical prohibition on submission.
- Preferences: events must show the settings dialog opening, email updates enabled, and preferences saved in order; the final page must show the saved result.
- Search: the field must contain the supplied query, then the requested topic must open and close in order.
- Missing article: no interaction events and a handoff.

The model sees ordinary page observations and the caller intent. Fixture expectations are confined to the test harness. There are no preselected target refs, application row parsers or hardcoded action sequences in the helper.

## Timing and cost

Timing begins before spawning the actual CLI and ends on its exit. It includes CLI/SDK initialization, API calls, browser gestures and observations. Navigation to the initial fixture page, browser startup, independent final assertions, and calling-agent planning/review are excluded. Each task has five sequential trials; the report retains the first invocation rather than dropping it as warm-up. The table reports median, minimum and maximum time across all trials, and mean provider-reported charge. Missing charges are recorded as unknown, never zero.

These are small, local pages on one machine. Five trials per task provide concrete reproducible samples, not a population reliability estimate or a statistical speed comparison against a larger model. Page complexity, network latency and model responses can change results.

## Development record

A [first fresh 30-trial run](evidence/benchmark-initial.json) also passed all 30 tasks. A separate terminal test then exposed an immediate-paste echo race in setup. Setup was corrected to enter hidden-input mode before displaying the prompt; a regression test now checks that real terminal interaction. The entire benchmark was rerun after this setup-only change so the final evidence hashes match the shipped files. Both new runs are published; neither uses earlier project measurements.

The offline suite has 30 tests, covering the prompt, saved-key permissions and environment precedence, automatic browser installation, permissive CLI use, explicit policy behavior, symlink invocation, action binding and execution limits. The prompt test uses Python 3's standard-library pseudo-terminal support. CI runs the suite on Linux with Node 20.3.0 and 24.

## Reproduce

Install the skill and run setup using the [README](../README.md). Then run from the installed skill directory:

```sh
npm test
npm run benchmark -- --rounds 5 --output /absolute/path/to/new-report.json
```

To choose another browser executable, add `--binary /absolute/path/to/agent-browser`. The benchmark uses your saved key or `OPENROUTER_API_KEY`. It makes billable model calls. It opens a loopback fixture server and its own uniquely named browser session, runs all trials without automatic retry, retains failed trials, closes that session/server and removes its temporary evidence files after consolidating them in the report. The output report is kept; its path must be new.

Both recorded runs confirm all cleanup steps. No existing user browser session is used.
