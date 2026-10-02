> **Historical research evidence.** Agent Browser Jev was archived on October 2, 2026. Results and decisions below belong to their original snapshots; the [final research report](../RESEARCH.md) records the later NO-GO decisions. Installation and automatic campaigns are discontinued.

# BrowserGym study

The [independent-caller comparison](webarena-caller-study.md) uses this same isolation and evaluator path for three separately attributed arms. `--arm baseline|candidate` records an isolated single arm without presenting it as a paired result.

**WebArena isolation repaired (2026-09-28):** the runner replaces the pinned Reddit backend before every arm, checks its identity and persisted-state readback, and blocks scored calls without current isolation and evaluator qualification. The old `/init` path only configures the application; all historical WebArena comparisons without clean-start evidence remain invalid and their raw rewards are excluded from dashboard score views. MiniWoB is unaffected. Scores depend on the exact frozen controller and task cohort; see the [capability scorecard](capability-status.md#isolated-webarena-development-check) for current and preceding evidence.

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

The `webarena-verified` suite uses BrowserGym's official adapter and WebArena-Verified's deterministic agent-response and network-trace evaluators. This repository supports a scoped set of Reddit mutate/navigation tasks, enumerated in `webarenaVerifiedSupportedCases` in [the study registry](../tests/browsergym-study-lib.mjs). The original eight tasks and subsequent practiced instances are development evidence. The current campaign additionally predeclared seven previously unrun templates using metadata before opening their goals; their first-attempt results must remain attributed to that frozen source and selection record. Subsequent metadata-selected cohorts take the second- and third-lowest single-site mutate IDs in each of those seven templates, excluding retrieval metadata before opening intents. Those are new instances of practiced templates, not unseen-family coverage. Retrieval tasks require arbitrary answer composition outside Jev's browser-control response contract. For a new campaign, select and predeclare a different unopened task as the single-attempt holdout; never relabel a development task or recycle a failed holdout as holdout proof.

Start the exact pinned environment and preserve its generated identity file:

```sh
npm run gym:webarena:env -- start \
  --run-dir /absolute/path/to/skill/.runs/webarena-verified-YYYYMMDD
```

Qualify persisted-state restoration without a model. This mutates the benchmark actor's biography, comment, subscription and vote records, checks that a deliberately dirty start cannot dispatch a model, and restores the original records and sequence values through the runner's replacement functions in both arm directions:

```sh
npm run gym:webarena:env -- qualify \
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

Each arm uses a different backend container ID from the pinned image, with no external mounts. A host lock excludes overlapping runs on that environment. Clean-start probes cover every public-table record count, database sequences, the benchmark actor's relevant user settings and owned comments, posts, votes and subscriptions. These are scoped persisted-state checks, not a cryptographic digest of every value in the database. Container replacement provides full storage isolation; the probes independently confirm the selected cohort's state. Probe data never enters Jev input.

`reset` now replaces the container; `check` performs a read-only clean-state check. A legacy environment file must be stopped and started again to capture a fresh reference. Changes to the isolation/evaluator harness invalidate qualification and require `qualify` and both smoke controls again. The runner checks qualification before model dispatch, saves each completed arm in `<output>.arms/`, and stops on missing evidence or unknown charges. Successful studies and positive controls restore the backend again after the last arm. After an interrupted run, inspect its private report and use `reset` or `stop` before further work. Do not remove a stale `.isolation-lock` until its owning process and trial container are confirmed stopped.

The official Reddit image is pinned by digest and runs on a dedicated labeled Docker network with explicit resource limits. On Apple silicon it runs under `linux/amd64`. The lifecycle command removes only the exact container and network it created; it does not prune Docker globally.

The adapter passes deduplicated double-quoted or curly-double-quoted strings from the caller's goal as literal values. It does not branch on task IDs or sentence templates, infer unquoted values, or read evaluator expectations. Literals may name fields or targets as well as values; Jev must use the goal to select the appropriate text. A prefix remains a search query, not a guessed final selection. Missing exact input remains a handoff and does not become a benchmark pass. The same transport is used for both arms, and changes to it must be recorded separately from controller improvements.

Widget handling depends on observed controls, not benchmark task names. Slider steps expose the observed handle and numeric readout; menu choices retain observed labels, icons and submenu affordances. If evidence is absent, a safe handoff may still score zero. Do not treat these boundaries as infrastructure failures or infer success from a helper completion claim.

## Watch a headed run

Add `--headed` to either command. The runner prints a localhost noVNC URL and a one-run password to the terminal. Open the URL while the run is active; the viewer closes with the container. A headed smoke run waits five seconds before acting by default. Increase the pause when you want time to open the viewer:

```sh
npm run gym:browsergym -- --smoke --headed --watch-delay-ms 15000 \
  --output /absolute/path/to/new-headed-smoke.json
```

For a scored study, `--watch-delay-ms 3000` pauses before each helper starts; the default is no pause. `--viewer-port 6080` chooses a fixed localhost port instead of an automatically selected one. Headless remains the default. The viewer is for observation; manual clicks would contaminate benchmark reward and should not be used in a scored study.

## Containment and cleanup

The runner builds `agent-browser-jev-browsergym:0.14.3-wav1` if absent. A named `docker run --init --rm` container hosts Chromium, Python and the helper copies. Init reaps orphaned browser processes; without it a long paired run reached the 512-process limit. WebArena uses one such browser container per arm and a fresh site backend for each; MiniWoB and integration retain the paired-container path. MiniWoB and integration sites are inside it; WebArena-Verified instead joins the dedicated environment network above. The baseline, candidate and bridge code are mounted read-only; helper dependencies are installed inside the container. Headless runs publish no ports. Headed runs publish only the noVNC viewer on `127.0.0.1`; Xvfb and password-protected VNC stay inside the container. The runner removes only its own named study container if interrupted or failed. Study reports remain at the requested output path; they never contain the viewer password.

Every new report gets a private `<output>.receipts` directory. The ordinary helper records its start, received events and returned result; the adapter records episode start, helper return, evaluation and cleanup phases atomically. Interrupted reports recover available episode records after container removal without turning a helper completion claim into reward. A returned result before evaluation retains its cost and trace but remains unverified. Partial evaluation or cleanup, malformed receipts and unknown charges stop the run; they do not become an empty successful matrix. Existing receipt directories cannot be reused for a new invocation. A host process killed before it writes the final report can still leave receipt files for manual recovery.

Use `--cleanup-image` to remove an adapter image created by that invocation after the run. To remove a retained image later, use `docker image rm agent-browser-jev-browsergym:0.14.3-wav1`. Do not use global Docker pruning. An interrupted build may leave Docker build cache layers; those are not benchmark services. The viewer uses classic VNC authentication over local HTTP/WebSocket, not TLS; do not expose or reverse-proxy its port to other machines. Docker administrators can inspect a running container's environment, including the viewer password and any OpenRouter key, so use a dedicated low-privilege key if that matters in your environment. Reports include page text, action traces and evaluator details; keep them private.


The runner records model dispatch explicitly: an empty failed report costs zero only when it proves no model was dispatched. After dispatch, missing usage remains unknown. Every suite records caller participation. Partial official reward is labeled `gym_reward_partial` in new reports; old raw failure labels remain unchanged. Supplemental, hash-bound reviews may fill missing historical caller counts with a named evidence method, but never override recorded intervention counts or official reward.

The adapter also accepts `ascending-numbers`, `find-greatest`, `number-checkboxes`, `social-media-some`, `email-inbox-delete` and `use-spinner` as explicit MiniWoB selections. The default practiced campaign still contains 21 families. These identifiers expand the runnable set without task-specific value inference or control hints; registration does not imply successful coverage. Consult the capability scorecard for the scored snapshot and holdout results.


### Additional MiniWoB task-family sample

The allowlist also contains `bisect-angle`, `book-flight`, `choose-date`, `circle-center`, `copy-paste`, `daily-calendar`, `find-word`, `login-user`, `order-food`, `phone-book`, `scroll-text` and `use-slider`. These names were selected from the pinned installed registry before opening task goals for the structural-evidence v20 transfer sample. The allowlist is metadata, not a capability claim; some tasks need observations, controls or supplied content the helper does not support. Value extraction and official scoring are unchanged. The campaign includes a practiced `click-button` control because its holdout must be a proper subset; exclude that control from new-family counts. Once scored, this exact sample is historical evidence, not an untouched holdout for future tuning. See the [capability scorecard](capability-status.md).
