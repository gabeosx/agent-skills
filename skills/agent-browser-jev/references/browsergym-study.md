# BrowserGym study

This optional lane adds tasks from [ServiceNow BrowserGym's MiniWoB integration](https://github.com/ServiceNow/BrowserGym/tree/main/browsergym/miniwob), not more copies of this skill's component fixtures. BrowserGym creates each seeded task and supplies its goal. Jev drives that exact Chromium page through agent-browser's CDP connection. BrowserGym then validates the page and returns the benchmark reward. A Jev `reported_complete` response with zero reward fails.

The Docker image contains BrowserGym 0.14.3, BrowserGym MiniWoB and WebArena-Verified adapters, WebArena-Verified 1.2.3, their matching Playwright runtime, agent-browser 0.38.1, Node 24 and MiniWoB++ at commit `7fd85d71a4b60325c6585396ec4f48377d049838`. AgentLab is not needed to run this narrow lane. The report records the built image ID and benchmark revision.

## Run

Docker is the only additional host dependency. First check that BrowserGym and agent-browser see the same page; this does not call Jev or require a key:

```sh
npm run gym:browsergym -- --smoke \
  --output /absolute/path/to/new-browsergym-smoke.json
```

For a scored comparison, prepare a separate baseline checkout of the skill and configure the ordinary OpenRouter key. The runner passes it to the short-lived container by environment variable; do not put the value in command arguments or reports.

```sh
npm run gym:browsergym -- \
  --baseline-dir /absolute/path/to/baseline/skills/agent-browser-jev \
  --output /absolute/path/to/new-browsergym-study.json
```

Default cases are `click-button`, `choose-list`, `click-checkboxes`, `enter-text` and `use-autocomplete`, with seeds 1, 2 and 3. `--cases` can also select `click-tab`, `click-menu` and `form-sequence`. `--seeds 11,12` replays or expands a study. Baseline and candidate receive the same benchmark seed; order alternates. The output includes raw reward, done state, helper return reason, traces, paired wins and regressions. Treat each case/seed as one trial, not a statistical reliability estimate. For a failure, inspect the generated goal and first divergent action, change the helper, rerun that seed, then test unused seeds and the local component study.

The [checkpointed campaign](browsergym-campaign.md) broadens this to 21 supported MiniWoB task IDs or a scoped WebArena-Verified cohort, records each pair immediately, and feeds a persistent localhost progress dashboard. It is the safer interface for longer budgeted studies and skill-change-gated retries.

`--suite integration` instead runs three original BrowserGym-core tasks (`contact-copy`, `preferences`, `review-approval`) on a small multi-page site hosted inside the same disposable container. It is a distinct integration suite, not an independent public benchmark or a replacement for WorkArena, WebArena, or AssistantBench. The task goal and visible page are the helper's only inputs; BrowserGym's task class independently scores the resulting browser state and submitted values. The same paired reward, seed, headed viewer, private report, and container cleanup behavior apply. For a direct study, add `--suite integration --cases contact-copy,preferences,review-approval --seeds 11,12`; the suite's three cases are the default when `--cases` is omitted.

The integration lane requires no ServiceNow instance, external website stack, or GPT evaluator. Do not describe it as a score on a public benchmark.

## WebArena-Verified

The `webarena-verified` suite uses BrowserGym's official adapter and WebArena-Verified's deterministic agent-response and network-trace evaluators. This repository intentionally supports Reddit mutate/navigation tasks `399`, `404`, `595`, and `650` as a public development cohort, plus task `603` only when it is predeclared as the campaign's sealed, one-attempt holdout. Retrieval tasks require arbitrary answer composition outside Jev's browser-control response contract. Do not relabel the development cohort as holdout evidence or reuse a failed holdout as development proof.

Start the exact pinned environment and preserve its generated identity file:

```sh
npm run gym:webarena:env -- start \
  --run-dir /absolute/path/to/skill/.runs/webarena-verified-YYYYMMDD
```

Then prove that a non-completion is rejected and a known-good mutation receives full official reward before allowing paid trials:

```sh
npm run gym:browsergym -- --suite webarena-verified --cases 399 --seeds 0 \
  --webarena-environment /absolute/path/to/run/environment.json --smoke \
  --output /absolute/path/to/run/smoke-negative.json

npm run gym:browsergym -- --suite webarena-verified --cases 595 --seeds 0 \
  --webarena-environment /absolute/path/to/run/environment.json --smoke --positive-control \
  --output /absolute/path/to/run/smoke-positive.json
```

The adapter supplies the benchmark's visible intent to Jev and creates the required final-response envelope only after Jev stops; hidden expected evaluator values never enter model input. BrowserGym 0.14.3's Playwright trace can omit form bodies or completed response content. The bridge supplements that trace with request/response records captured from the same Playwright page, then passes the combined trace to the unchanged official evaluator. A positive control must earn reward 1; partial reward is an adapter failure, not a usable baseline.

For a direct paired study, add `--baseline-dir`, omit `--smoke`, and choose the desired supported cases. Stop the environment with the exact run directory when finished:

```sh
npm run gym:webarena:env -- stop \
  --run-dir /absolute/path/to/skill/.runs/webarena-verified-YYYYMMDD
```

The official Reddit image is pinned by digest and runs on a dedicated labeled Docker network with explicit resource limits. On Apple silicon it runs under `linux/amd64`. The lifecycle command removes only the exact container and network it created; it does not prune Docker globally.

The adapter passes literal `enter-text` values and `use-autocomplete` prefixes from BrowserGym's goal as caller-supplied values. A prefix is only a search query, not a guessed final item; if no exact matching option becomes observable, `input_required` is an expected handoff and the reward remains zero. A selected suggestion must still be submitted when the form exposes Submit. `form-sequence` exposes an unlabeled slider handle; the helper uses only its observed handle metadata and adjacent numeric readout for one keyboard step at a time, and can ground an explicitly ordinal checkbox in observed order. If that evidence is absent, a safe handoff may still score zero. Do not treat these boundaries as infrastructure failures or infer success from a helper completion claim.

## Watch a headed run

Add `--headed` to either command. The runner prints a localhost noVNC URL and a one-run password to the terminal. Open the URL while the run is active; the viewer closes with the container. A headed smoke run waits five seconds before acting by default. Increase the pause when you want time to open the viewer:

```sh
npm run gym:browsergym -- --smoke --headed --watch-delay-ms 15000 \
  --output /absolute/path/to/new-headed-smoke.json
```

For a scored study, `--watch-delay-ms 3000` pauses before each helper starts; the default is no pause. `--viewer-port 6080` chooses a fixed localhost port instead of an automatically selected one. Headless remains the default. The viewer is for observation; manual clicks would contaminate benchmark reward and should not be used in a scored study.

## Containment and cleanup

The runner builds `agent-browser-jev-browsergym:0.14.3-wav1` if absent. One named `docker run --rm` container hosts Chromium, Python and both helper copies. MiniWoB and integration sites are inside it; WebArena-Verified instead joins the dedicated environment network above. The baseline, candidate and bridge code are mounted read-only; helper dependencies are installed inside the container. Headless runs publish no ports. Headed runs publish only the noVNC viewer on `127.0.0.1`; Xvfb and password-protected VNC stay inside the container. The runner removes only its own named study container if interrupted or failed. Study reports remain at the requested output path; they never contain the viewer password.

Use `--cleanup-image` to remove an adapter image created by that invocation after the run. To remove a retained image later, use `docker image rm agent-browser-jev-browsergym:0.14.3-wav1`. Do not use global Docker pruning. An interrupted build may leave Docker build cache layers; those are not benchmark services. The viewer uses classic VNC authentication over local HTTP/WebSocket, not TLS; do not expose or reverse-proxy its port to other machines. Docker administrators can inspect a running container's environment, including the viewer password and any OpenRouter key, so use a dedicated low-privilege key if that matters in your environment. Reports include page text, action traces and evaluator details; keep them private.
