# Reproducible acceptance evidence

This evidence is for the general-purpose helper in version 0.1.1. All pages and inputs are synthetic, supplied by the bundled fixtures. The published reports contain no private application records or login material.

## Recorded configuration

- Run: 2026-09-25T03:09:30.084Z to 2026-09-25T03:09:44.495Z
- Node: `v26.5.0`; platform: `darwin-arm64`
- Browser: `agent-browser 0.33.2` (caller-supplied native fork)
- Model: `typesafe/jev-1.13`; pinned OpenRouter SDK 1.3.2
- Execution: skill installed with `npx skills` into an unrelated temporary project; direct and symlinked command entrypoints; actual browser and provider calls, no substitutes.
- The final report hashes the three runtime files and the fixture/harness sources; those hashes match this release's files.
- Local offline tests: 24 passed, including the Node 20.3.0 minimum. CI reruns them on Linux with Node 20.3.0 and 24.

## Final run

[Full final report](evidence/final.json) includes actions, observations, fixture events, independent final snapshots, costs and source hashes.

| Scenario | Result | CLI elapsed | Gestures, including waits | Reported model charge |
| --- | --- | ---: | ---: | ---: |
| `duplicate-labels-copy` | passed | 1.347 s | 2 | $0.000104748 |
| `reordered-labels-symlink` | passed | 1.110 s | 2 | $0.000104748 |
| `literal-fill-symlink` | passed | 0.861 s | 1 | $0.000079296 |
| `delayed-rendering` | passed | 2.511 s | 5 | $0.000207690 |
| `missing-target` | passed | 0.784 s | 0 | $0.000031290 |
| `unauthorized-action` | passed | 0.684 s | 0 | $0.000028392 |

A handoff is the required success outcome for the last two scenarios. The other four require model-reported completion **and** independent fixture assertions. Cleanup confirmed that the test browser was closed, the local server stopped, and temporary task/policy files removed.

Timing starts immediately before spawning the CLI and stops when it exits. It includes CLI/model initialization, API calls, snapshots and gestures; it excludes initial browser launch, navigation to each case, and final independent assertions. Costs are provider-reported model charges only. These single samples are acceptance measurements, not a speed comparison or a reliability rate. Model behavior and latency can vary on a rerun.

## Failures retained during development

- [First attempt](evidence/first.json): the correct details opened and closed, but Jev handed off rather than recognizing completion. Action history had lost prior screen context. The request now includes the previous observation so the model can interpret the transition.
- [Context attempt](evidence/context.json): both catalog cases passed; text entry handed off. Supplied values existed inside candidates but were not explicit in the request state. They are now carried as caller-supplied values. The fixture policy was also corrected to accept whitespace in a field label, so both text fields remain offered.
- [Values attempt](evidence/values.json): the actual fill and final value were correct, but the test incorrectly required exactly one DOM input event. Native fill emitted clear/insert events. The assertion now checks that all events affect the intended field, the final literal is exact, the neighboring field is unchanged, and nothing was published.

These runs were stopped on their first failed assertion and were not retried without recording the failure. No production site-specific parser or success classifier was added to obtain passing results.

## Reproduce

Install the skill and dependency as described in the [README](../README.md). Supply the API key through your normal secret environment; do not put it on the command line.

```sh
npm test
npm run test:live -- --binary /absolute/path/to/agent-browser --output /absolute/path/to/new-report.json
```

Run those commands from the installed skill directory. The live runner creates and closes only its own uniquely named browser session and loopback server. Its output path must be new. If a run fails, preserve its report before changing anything; do not report only a later pass.

The fixtures and assertions are in `tests/live.mjs` and `tests/fixtures/pages.mjs`. Model candidates come from real observations and the fixture permission scope; expected events and final assertions stay exclusively in the harness.

Passing finite fixtures does not prove every website, a universal permission classifier, or correctness of business effects. Those are deliberately absent from the advertised contract.
