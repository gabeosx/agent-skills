> **Historical research evidence.** Agent Browser Jev was archived on October 2, 2026. Results and decisions below belong to their original snapshots; the [final research report](../RESEARCH.md) records the later NO-GO decisions. Installation and automatic campaigns are discontinued.

# Test, verify, improve

The component study runs the same local pages against two versions of the helper. The harness owns the tasks, starting state, hidden verifier and cleanup. Each arm uses its own helper code and the same configured Jev model and agent-browser executable. Run order alternates by variant and seed.

## Run a study

Install this skill's dependencies with `npm ci`. Prepare a separate baseline checkout of `skills/agent-browser-jev` and run `npm ci` there as well. The baseline path is read as code; it is never edited by the study runner. Use a new absolute output path:

```sh
npm run gym:study -- \
  --baseline-dir /absolute/path/to/baseline/skills/agent-browser-jev \
  --output /absolute/path/to/new-study.json
```

The default study exercises native dates, similar record selection, a delayed command palette, delayed feedback and a safe missing-target handoff. It runs each on the original page and three controlled variations: reordered controls, slower completion, and a hostile page-owned instruction with a decoy button. Use `--cases`, `--variants`, `--seeds` and `--rounds` to focus a failure or test fresh variations. For example:

```sh
npm run gym:study -- \
  --baseline-dir /absolute/path/to/baseline/skills/agent-browser-jev \
  --cases native-date,similar-record --variants base,reordered,slow \
  --seeds 11,12 --rounds 2 --output /absolute/path/to/date-selection-study.json
```

The report pairs tasks by round, seed, variant and case. It records helper file hashes, version, browser version, exact verifier conditions, return reason, time, provider-reported charge and a failure class. The adjacent `.runs` directory holds synthetic step traces. Helpers with the opt-in event hook record each observation, offered candidate set, chosen action, action readback and final reason; older baselines retain action readbacks only, marked `traceCoverage: actions_only`. Normal task invocations do not write these files. Keep study output private if fixtures are replaced with real pages; traces contain page text and supplied values.

To compare two existing component reports without calling Jev or opening a browser:

```sh
npm run gym:study -- \
  --baseline-report /absolute/path/to/baseline-components.json \
  --candidate-report /absolute/path/to/candidate-components.json \
  --output /absolute/path/to/comparison.json
```

## Read a failure

A case passes only when all named conditions hold: the helper exited normally, gave the expected completion or handoff reason, avoided the forbidden decoy, produced exactly one completion event when needed, saved the exact structured state, and left the expected final page visible. The study then labels the first useful failure category: infrastructure, scope violation, wrong committed state, premature completion, uncertain action, limit, incomplete handoff or no progress. Inspect the first divergent frontier and action readback in that case's trace before editing the controller, candidate discovery or decision prompt.

Repeat the failing case on its original seed, then on unused seeds and the full fixed matrix. The study verdict reports paired wins and regressions on the measured cases; it does not claim a population reliability rate or statistical significance from a small run. Keep failed and incomplete reports rather than replacing them with only passing attempts. If a candidate regresses any paired case, the study exits nonzero.

For focused progress and completion counterexamples, run:

```sh
node tests/progress-live.mjs --output /absolute/path/to/new-progress.json \
  --helper-dir /absolute/path/to/frozen/skill
```

This separate, self-authored eight-case live suite checks a slider with a different step size, already-satisfied settings, preparing a form without saving it, and preserving native multiple selections, with alternative goal wording and reordered controls where applicable. Real Jev decisions drive agent-browser; server events and final state verify changes, exact values and commit counts. Its paid charges belong in the campaign's total budget. It is a regression check, not an independent benchmark or a novel-task holdout.

For the delegation boundary and resumption contract, run:

```sh
node tests/handoff-live.mjs --output /absolute/path/to/new-handoff.json \
  --helper-dir /absolute/path/to/frozen/skill
```

This self-authored six-case suite separates three Jev-only goals, an expected absent-target handoff, and two scripted caller recoveries. Recovery decrypts an actual resume token, supplies missing input or changes a visible control, and resumes against the same page. Server events check exact state, preservation of caller work and single commits. The caller is scripted; these results do not measure an independent Codex/GPT agent or count assisted outcomes as autonomous benchmark passes.

## Accept a general improvement

Before changing runtime code from a failure, state the missing capability in terms of browser mechanics or the caller contract. A fix that needs a task ID, a benchmark sentence, a site-specific route, or a reward-triggering action belongs outside the generic controller. Do not undo satisfied state to make an evaluator observe a fresh mutation; record that mismatch as a limitation.

Validate the abstraction with counterexamples as well as the original failure: equivalent goal wording, reordered clauses, different control labels and layouts, an already-satisfied goal, a plausible but wrong target, and missing evidence. Keep recovery and handoff routes available. Tests should verify grounded choices, authorization, state changes and outcome checks; assertions that a particular benchmark hint was emitted do not establish transfer. Mocked-model tests only establish wrapper behavior.

Freeze one candidate before scoring a regression matrix. Report its task coverage and fingerprint, including failures and untested cases. Accumulated repaired outcomes across code versions are development history, not a final implementation score. After regression checks, use unopened task families for a one-attempt holdout; new seeds within a practiced family are only variation tests. If a holdout informs another edit, it becomes development data. Keep adapter and runtime changes separate in the interpretation: better goal transport is not necessarily better browser reasoning.

Maintain the [capability and takeover scorecard](capability-status.md#keep-autonomy-visible-in-future-evaluations) with each evaluation update. Report verified Jev-only outcomes, verified `reported_complete` outcomes, every other return reason, and actual caller assistance separately for each control family and frozen snapshot. Keep expected negative checks outside the positive completion numerator. A new handoff or added caller work on a previously completed supported task is an autonomy regression to investigate even when official reward stays unchanged. Do not hide it behind a safe-handoff pass or a combined caller-plus-Jev score.

## Frozen MiniWoB evaluation: 2026-09-28

The initial 1.3.0 refactor failed the regression acceptance gate. A frozen comparison against the saved 1.2.1 baseline ran 21 practiced MiniWoB task families on then-fresh seeds 1001 and 1002, with one attempt per arm and zero retries or runtime edits during scoring. The later improvement campaign below preserves this negative result.

| Metric | Baseline 1.2.1 | Candidate 1.3.0 |
| --- | ---: | ---: |
| Official reward passes | 41/42 (97.6%) | 33/42 (78.6%) |
| Reported complete without reward | 0 | 4 |
| Handoffs without reward | 1 | 5 |

There were eight paired regressions, zero wins and one shared failure. All failures remain in the denominator. The baseline also had one `no_progress` return after achieving full reward; the official task state, rather than either helper's completion claim, determines this score.

The candidate's nine failures were:

- Autocomplete, both seeds: handed off before trying the supplied prefix in one episode; selected the matching suggestion but omitted Submit in the other.
- Nested menu, seed 1001: clicked intermediate parents instead of hovering, then reported completion with zero reward. Seed 1002 passed.
- Slider form sequence, both seeds: reached the requested slider value, moved one extra step, and submitted the wrong value.
- Tree navigation, both seeds: handed off without exploring the available expandable branches.
- Agreement form, both seeds: handed off before using the available textarea-scroll action. The baseline also failed seed 1001 after scrolling once and clicking Cancel without entering the name.

Both arms used the same frozen 1.3.0 goal-literal transport and BrowserGym bridge, Jev `typesafe/jev-1.13`, agent-browser 0.38.1 and BrowserGym 0.14.3. MiniWoB was pinned to `7fd85d71a4b60325c6585396ec4f48377d049838`; success required official reward 1 and `done=true`. This compares the two controllers under a common adapter, not their historical end-to-end configurations. Positive same-page and negative completion controls passed before scoring. One preliminary no-model negative-check setup failed on an unrelated WebArena dependency import; the isolated MiniWoB check passed before any scored episode.

The scored matrix took 305 seconds (415 seconds from campaign initialization), cost $0.02390115 in reported model charges against a $2 ceiling, and removed all 42 pair containers. Source and report hashes were verified. The runtime fingerprints were baseline `22879b9e541e06cbd189d905a8e9d39d4929b46f35745dec970e2d38410fe019` and candidate `614a204efa1cbb200e2a512b4b58a8f3577a498cb12dccf0dd131ddbbfa8e1b5`. Private reports, failure traces and frozen snapshots are retained in `.runs/miniwob-refactor-20260928/` at the skill root; they are not distributed with the skill. These scores belong to that initial snapshot, before the subsequent runtime improvements.

Removing task-specific branches did not preserve measured performance. The traces pointed to missing general exploration, multi-step goal tracking and state verification; they did not isolate which code or prompt change caused each regression. Those failures informed the continuation below. No untouched task-family holdout was scored, and this small selected subset establishes neither full MiniWoB performance nor transfer to novel websites. Historical live results continue to belong to their recorded source snapshots.

## MiniWoB improvement continuation: 2026-09-28

Continued testing exposed why a perfect practiced score was insufficient. General exploration guidance improved the first matrix from 33/42 to 40/42. Two relevant repairs addressed stale slider history and partial textarea scrolling; their accumulated 42/42 result was not treated as a frozen score. A complete frozen replay then passed 42/42 against 41/42 for the saved baseline.

The same source scored only 38/42 against 39/42 on predeclared seeds 1003 and 1004. Its failures exposed native multi-selection replacing a prior selection, ineffective scrolling during tree exploration, and paginated-result errors. A relevant multi-select retry passed; the first exploration repair still failed three of four checks because alternating scroll directions reopened ineffective choices. All these failures remain preserved.

The subsequent general changes discover the native `multiple` attribute only on observed listbox references, recover selected option labels, preserve the current selected set when adding or removing an observed option, and withhold ineffective scroll directions across an unchanged observation. They contain no task IDs, target names, benchmark sentence templates or answer combinations.

| First-window frozen matrix | Baseline 1.2.1 | Candidate 1.3.0 |
| --- | ---: | ---: |
| Seeds 1005 and 1006; 21 families | 38/42 | 39/42 |
| False completion reports | 2 | 2 |

These seeds were reserved before the corresponding changes. The matrix used one attempt per arm, no edits during scoring and official reward 1 plus `done=true` as the pass condition. Paired wins: 2; regressions: 1. The first-window runtime fingerprint is `2f2f6a2501edb98887ad5486a454ea3e41ad865718b91b2ac7141c9d02049b2c`. Earlier 42/42 and 38/42 results belong to a different frozen runtime, not that first-window implementation. The remaining failures are listed by case in the private evaluation summary. A 100% general reliability claim is not supported.

That frozen runtime passed the broad self-authored component matrix 28/28, and 132 offline checks passed. Eight live progress counterexamples passed before the last scroll-loop tightening: different slider steps, preserving already-correct values, preparing without saving, and retaining an existing native multi-selection with reordered options. These are supporting regressions, not an independent task-family holdout. Source hashes identify each tested revision.

One earlier qualification run stopped after a failed decision request with incomplete charge accounting; its failed episode and interrupted pair remain in the audit. The helper now counts failed attempts, reports sanitized failure metadata, preserves unknown cost as `null`, and does not retry requests or switch models. The unknown charges were conservatively reserved before testing resumed.

Across the original comparison and continuation, measured charges were $0.183250284, plus a conservative $0.460163634 reserve, for $0.643413918 accounted against the $2 limit. The reserve uses the key's cumulative usage and intentionally overcounts rather than claiming an exact task charge. The final matrix finished within the original 60-minute window. Every reported pair container was removed; live fixture sessions and servers were closed. The existing persistent dashboard remains available and now discovers nested evaluation bundles.

Private manifests, saved source snapshots, hash-checked reports, all failed attempts and the consolidated audit are retained under `.runs/miniwob-general-improvement-20260928/`. These are local evidence, not distributed artifacts. No untouched task-family holdout or full MiniWoB run was performed.

## MiniWoB constraint extension: 2026-09-28

Within the same $2 total ceiling, the user authorized another 60 minutes and then up to 20 further minutes conditional on meaningful progress. The final frozen source scored **42/42 on development seeds 1007–1008 and 41/42 on predeclared fresh seeds 1009–1010**. The identical source and runtime were used in both matrices. Each covers 21 selected, practiced task families, one attempt per arm, with official reward 1 and `done=true` required. No provider retry, fallback model or human intervention was used. The comparison baseline is the saved pre-extension 1.3.0 controller that previously scored 39/42; the earlier 1.2.1 comparison remains above.

| Extension run | Candidate | Saved controller |
| --- | ---: | ---: |
| constraint-repair | 2/3 | 0/3 |
| constraint-qualification | 39/42 | 39/42 |
| constraint-qualification-v2 | 40/42 | 39/42 |
| constraint-qualification-v3 | 42/42 | 39/42 |
| constraint-qualification-v4 | 41/42 | 39/42 |
| constraint-transfer | 41/42 | 38/42 |
| submenu-qualification | 41/42 | 37/42 |
| completion-qualification | 42/42 | 37/42 |
| completion-transfer | 41/42 | 39/42 |

Jev identifies which explicit goal literals belong to which observed control or collection. Code performs numeric comparisons, combined text matching and positions across sequentially observed pages. It distinguishes ordinal positions from numeric labels and identifier digits, recognizes flat document-level collections, and retains observed child-navigation metadata. All runtime scripts are included in study and fixture source inventories. Interpretations still can be wrong, and the caller remains responsible for final verification.

Earlier revisions reached 42/42 and later regressed. A fresh-seed run scored 41/42 after failing to open a submenu; once inspected, those seeds became development data. Supplying the observed submenu flag on hover actions repaired that failure. Its full replay then exposed premature completion after selecting the correct autocomplete item. The last revision places the existing distinction between form completion and preparation-only requests directly in the completion criterion. Its targeted retry passed, but the baseline also passed that replay, so the one-case retry alone does not establish improvement. All failed reports and snapshots remain preserved.

The final source passed 148 offline tests, 28/28 live component checks, and 8/8 live progress checks, including both preparation-without-submission cases. A preceding runtime reached all six independently verified states in separate self-authored constraint fixtures, but only five returned completion. The unequal-page-size case selected the correct fifth item and then handed back control; its strict completion metric remains 5/6. These fixtures were not rerun after the final submenu and completion-criterion changes and are development evidence, not another independent benchmark. Three preliminary fixture runs were incomplete after browser command timeouts; no-model replays isolated default arrow-key behavior in the custom slider, which was corrected before completed fixture runs. Original failures and cleanup reconciliations remain retained.

Final runtime fingerprint: `d15f47bf91ca1fd86f1a8b2e2430c51c7714731c786f6c3d200902dde54ad130`. Event chains, frozen source and report hashes, clean initial states and every pair-container removal were audited. Total measured model spend across all windows was $0.455258706, with $0.460163634 conservatively reserved for earlier unknown charges: **$0.915422340 accounted of $2**. Scored runs finished before the final authorized deadline of 2026-09-28 19:07:52 UTC. Private evidence and `extension-summary.md` remain under `.runs/miniwob-general-improvement-20260928/`. The persistent localhost dashboard is retained.

The remaining fresh-seed failure was `click-tab-2/1010`: after inspecting two of three tabs, the helper handed off while an unvisited tab remained available. No runtime change followed this result. At that checkpoint, general exploration-state tracking remained a proposed next improvement. The following iteration implements and evaluates it.

A perfect matrix is a result for that sample, not a reliability guarantee. The families were practiced; new seeds do not establish performance on unseen websites, unseen task families or the entire MiniWoB benchmark. The separate installed copy was not upgraded. The tested work remains the pending repository version 1.3.0, without a commit or release.

## Delegation and handoff evaluation: 2026-09-28

The next iteration makes productive Jev work and useful caller takeover the contract. Bounded navigation facts preserve attempted and observed-selected routes without treating their existence as a requirement to explore. Structured handoffs retain unfinished intent, last action/readback, observation limitations and a suggested caller action. Tracking resets after caller intervention; uncertain effects require verification before replay.

The first frozen qualification scored 41/42 versus 40/42 on development seeds 1009–1010. After two caller-evidence corrections, the final frozen runtime scored 42/42 versus 40/42 on predeclared fresh seeds 1011–1012: two wins, zero regressions. Each matrix covers 21 practiced families with one attempt per arm and official reward 1 plus done required. No caller recovery, provider retries or fallback contributed to these scores. The remaining qualification tab handoff retains useful route context but remains a failed episode.

All 161 offline tests passed. Final-runtime live delegation checks passed 6/6: three Jev-only completions, one expected absent-target handoff and two scripted caller recoveries through encrypted resume tokens. These verify missing-input continuation and preserving a caller-selected value without duplicate commits; they do not establish independent Codex/GPT caller performance. On the preceding snapshot, broad components passed 28/28 and progress fixtures reached 8/8 verified states but only 7/8 strict completion reports. A correct saved multi-selection followed by handoff remains a failed strict completion check.

The four-task WebArena-Verified pilot is **invalid as a paired performance comparison**. Although evaluator controls passed and reset calls returned, the baseline initial page on task 650 contained the candidate-created comment. Task 399 baseline also saved the prior biography without filling it. Raw rewards (candidate 2/4, baseline 1/4) and all traces are preserved for diagnosis, not improvement claims. Task 404 additionally made an extra Upvote before changing sort order, despite full reward. The pinned Reddit environment POST /init only configures the site name and clears the Symfony cache; it does not restore database contents. The adapter incorrectly used /init as a reset before each arm. Before further WebArena scoring, use a genuinely fresh site or restore a verified database snapshot, then prove a mutate/reset/readback cycle and repeat between arms. Handoff quality cannot compensate for false completion or unrelated mutations.

Final runtime fingerprint: `a79b23f8f1dc2653b547d6ec76e61911c15343bafd5447d957508ae6d16fa541`. Source/report hashes and event chains were audited. Total charges across all windows: $0.541979676 measured plus $0.460163634 prior conservative reserve, or **$1.002143310 of $2**. Trial containers and the scoped WebArena site/network were removed; the persistent localhost dashboard remains and displays the reset blocker. Private reports, snapshots and audit are in `.runs/handoff-improvement-20260928/`. Repository version remains pending 1.3.0; no global install, commit or release occurred.

## Containment

This lane uses the existing Node helper, agent-browser, a loopback HTTP fixture and the configured OpenRouter key. It installs no BrowserGym, Python package, database or background service. Each component run closes its browser session and server and removes its temporary synthetic upload file; the report records those cleanup outcomes. The user-owned study reports remain at the requested output path.

The optional [BrowserGym MiniWoB study](browsergym-study.md) adds independent benchmark tasks in one ephemeral Docker container. It remains separate from this local component lane so both a controlled regression suite and an external task source can inform an improvement.


## WebArena isolation qualification and scoped review: 2026-09-28

The runner now recreates the pinned Reddit container before each arm, confirms no mounted backend storage, checks persisted actor records, table counts and sequences against a fresh-image reference, and blocks missing or dirty evidence before model dispatch. No-model controls proved synthetic mutations persist, dirty state blocks execution, and replacement restores original values in both transition directions. Both official evaluator controls passed; each control also restored its mutations afterward. Final lifecycle cleanup hardening was requalified without a model.

The frozen paid study retained the previously tested helper runtime and compared the same four known Reddit development tasks on clean state. Both arms earned 2/4 official full rewards, reached 2/4 reviewed full goals, and completed only 1/4 with correct scope. Both returned `reported_complete` on every task, with zero handoffs or caller intervention. The newest-post case reached the requested goal but also upvoted an unrelated post. The subscription case omitted the required source-page condition. The reply case selected a comment rather than the post. No result is relabeled by the supplemental review, and no controller improvement is claimed from this harness repair.

The study used eight distinct backend IDs, no retries and no unseen holdout. It took 133 seconds and cost $0.017396694. Cumulative accounting is $0.559376370 measured plus $0.460163634 reserved, totaling **$1.019540004 of $2**. It ran within the renewed 20-minute / $0.90 allowance. Old unqualified WebArena comparisons remain invalid in dashboard views; reports, attempts and charges are preserved. Hash-bound supplemental audit events expose completion reports, actual caller assistance, wrong effects and unassessed checks separately from official reward.

Private evidence and source snapshots are under `.runs/webarena-isolation-20260928/`; the capability scorecard summarizes the supported claims. The next controller experiment should address grounding the target, ordering and containing page before mutation, with alternate layouts, paraphrases, already-correct states and misleading neighboring controls. The current runtime was preserved rather than promoting an untested prompt change from four practiced cases.


## Target scope and completion evaluation, 2026-09-28

The next authorized window improved the observed frontier: document-order candidates, bounded previews of other action windows, and sanitized destinations of already-observed links. Explicit source-page requirements receive a separate navigation prerequisite; ordinary goals are not assigned invented source requirements. A narrow charged Jev review distinguishes a prepared form from a committed outcome. These remain hints and model judgments, not a general semantic correctness guarantee.

The selected frozen source `387b28da42bd97f4d49f214994b804dd983c481a429ca050af76695dbd289131` scored 5/8 official WebArena rewards against 3/8 baseline: three wins, one regression. Independent effect and trace review found 6/8 scope-correct full goals versus 2/8. The official regression had the correct stored question and forum but partial reward; the evaluator-route explanation remains inferred. The top-post subscription left the required source page before mutating and is a confirmed failure. Broad forum relevance remains unassessed. All eight returned completion, with one confirmed false completion and zero caller intervention for the candidate. Full reward, correct scope and completion reports are separate measures.

The same source reached 42/42 MiniWoB goals versus 42/42 on seeds 1021–1022 across 21 practiced families. Completion reporting regressed to 38/42 versus 39/42: four versus three non-complete returns, all after verified success. Final live checks passed 27 positive components plus one expected negative, seven scope goals plus one expected negative, and three delegation goals plus one expected negative and two scripted caller recoveries. Progress reached 8/8 states with 7/8 completion reports. Targeted autocomplete/scroll checks passed 4/4 in both arms. No independent caller agent or untouched family was evaluated.

The development history is retained: broad source staging caused component failures; later versions missed autocomplete submission, handed off before searching an available route, or failed scrolling. An intermediate version scored 6/8 WebArena but did not pass all regression checks. The final short instruction repaired the search handoff but re-exposed the source-page failure. Do not combine the best per-task outcomes across these snapshots. Further prompt iteration was stopped because these tradeoffs remained unstable and the next useful evidence requires stronger contextual verification and untouched-family evaluation.

All 183 offline tests passed. Reporting hardening distinguishes pre-dispatch zero cost from unknown post-dispatch charges, records MiniWoB caller participation, preserves partial rewards and safely emits large status reports. Those harness-only changes were requalified with no-model isolation and evaluator controls after paid scoring. Paid work used $0.530849298 in the renewed 60-minute / $0.98 allowance. Cumulative accounting is $1.090225668 measured plus $0.460163634 reserved = **$1.550389302 of $2**. Private source snapshots, rejected variants, reports, audits and cleanup records remain in `.runs/target-scope-improvement-20260928/`. The dashboard remains available; nothing was committed, published or installed globally.

## Requirement-interpreter evaluation (2026-09-28)

The requirement interpreter is implemented, with **204 offline tests passing**. Numeric and text bindings are advisory, unsupported meanings remain explicit, and semantic judgments cannot delete authorized controls or rewrite the caller goal. A separate same-model review uses observed action readbacks without earlier model verdicts. This reduces rigidity; it does not establish a general capability gain.

The final frozen runtime reached **42/42 MiniWoB goals versus 42/42 baseline** on fresh seeds of 21 practiced families, with 40/42 completion reports versus 38/42. The predeclared six-family holdout reached **1/6 for both versions**. Jev returned control on five holdout failures versus four baseline returns; the baseline's other failure was a false completion. No caller completed these tasks.

The isolated eight-task WebArena comparison earned **4/8 official full rewards versus 5/8 baseline**, and **5/8 scope-correct goals versus 6/8**. The candidate made 1 confirmed false completion claims and returned control 1 times. The remaining source-context and observation limits are explicit in the [capability scorecard](capability-status.md). Historical contaminated comparisons remain invalid.

The final runtime passed 27 positive component goals and one expected negative in the reordered layout; its accordion pass was a targeted repair, not a first-attempt success. Earlier interpreter fixtures improved compound-number handling (8/8 versus 5/8 baseline), but belong to earlier snapshots. No independent caller LLM was evaluated. See the [evaluation record](study-gym.md#requirement-interpreter-evaluation-2026-09-28) for snapshot boundaries and preserved failures.

The exact snapshots, provider failures, raw goal/source evidence and retry boundaries are retained in `.runs/requirement-interpreter-20260928/`. The attempted shorter selector and misleadingly verdict-conditioned completion review were not accepted as general improvements. No runtime was changed after the six-family holdout. Paid work stopped at the observed capability and retry boundaries rather than spending the whole allowance.


## Action review and historical-controller lessons (2026-09-28–29)

The current campaign learns from the earlier deterministic goal rules while keeping semantic interpretation in Jev. It retains concrete browser facts, supported arithmetic, accumulated content positions and detailed navigation distinctions. Proposed-action review receives those facts conditionally on their model bindings; it cannot treat its own assessment as independent verification. Exact caller-goal spans can supply discovery queries, while final content still comes from caller values. Identical text under multiple caller keys remains available for legitimate reuse instead of acquiring an exclusive semantic-role veto.

The controller also bounds serialized choices and historical readbacks, focuses an observed link and presses Enter once when activating it, and gives unfinished handoffs a bounded continuation review. A no-model diagnosis showed wrapped link pointer activation could report success without navigating. Request size reduction resolved one observed provider rejection; it does not guarantee acceptance of every request. These mechanical repairs are distinct from semantic capability claims.

The preserved progression matters:

| Frozen source / sample | Candidate / baseline result | Interpretation |
| --- | --- | --- |
| Action-review v8, eight unopened Reddit instances | 5/8 / 4/8 official full reward | One wrong-source false completion remained; forum relevance unassessed in another case. More model calls and cost. |
| V8, 21 practiced MiniWoB families, seeds 1041–1042 | 37/42 / 41/42 goals | Four new tree/ordinal-search failures exposed overconfident action-review vetoes. |
| V9, four targeted regression replays | 4/4 / 0/4 against frozen v8 | Conditional numeric/position evidence and branch-expansion wording repaired these practiced cases. |
| V9, same 21 families, fresh seeds 1043–1044 | 42/42 / 42/42 goals and completion reports | Practiced-family regression check, not unseen-family transfer. |
| V9, four unopened Reddit instances | 2/4 / 2/4 official and scope-correct goals | Both failed the manager-reply target; candidate forum relevance in another task remained unassessed. |
| Unchanged stronger historical target-scope v6/v7, same four states | 2/4 / 2/4 official and scope-correct goals | Earlier higher scores did not transfer to this cohort. These retrospective controls do not invalidate the earlier scores or establish universal parity. |
| V11, 21 practiced MiniWoB families, seeds 1045–1046 | 42/42 / 42/42 goals; 41/42 / 41/42 completion reports | Both returned control after a correct menu task. |
| V11, three completed pairs from four unopened Reddit instances | 1/3 / 2/3 official; 2/3 / 2/3 scope-correct goals | Candidate replied to the wrong nested comment on one task, but created a relevant ML question receiving partial official reward on another. |

The fourth v11 pair was interrupted by a baseline HTTP 503. The completed candidate achieved its goal, but that pair stays excluded from paired scores. The incomplete arm, its no-effect state and conservative charge reserve remain recorded. Another v10 fixture run stopped on HTTP 520; four earlier positive cases, a false veto and the unrun negative case remain distinct. No provider failure was silently retried.

Bounded article excerpts exposed the requested manager text but did not recover the manager-reply task. A subsequent first-reply task regressed. The excerpt-removal ablation then passed in both the new candidate and the unchanged v11 control, which had originally failed. That source-identical outcome change makes the causal explanation inconclusive. The simpler observation path is retained because the added excerpts showed no verified recovery, not because their removal is proven to fix reply selection. Frozen v10/v11 implementations and tests preserve the rejected experiment. Compact observations remain explicitly marked limited.

The final snapshot, action-review v12, reached 40/42 MiniWoB goals versus 38/42 on seeds 1047–1048. Both claimed completion 41 times, with one versus three false claims and one unfinished handoff each. Three unopened Reddit instances earned 3/3 official rewards in both arms, with 2/3 independently verified full goals and one unassessed title-only review each. There were no observed extra effects or caller interventions. These are public benchmark instances within a practiced site, not unseen-family or uncontaminated training holdouts. The source was frozen before these final samples. Case 411 was excluded as GitLab using metadata before opening its intent; there was no replacement. The practiced control 399 is excluded from holdout scores. See the [current capability scorecard](capability-status.md) for final counts, completion reports, incorrect effects and cost. Final self-authored checks passed 27 component goals, seven scope goals and six query/content goals, with one expected negative in each lane. No caller assisted these trials; independent caller-LLM recovery, actual takeover effort and production reliability remain unmeasured.

Source/ranking and recipient/thread binding are the remaining semantic wall. More same-model checks can increase cost, falsely reject useful navigation, or agree on the wrong target. The next distinct experiment should supply compact, observed object/parent relationships with evidence references and test target binding on new layouts before adding more semantic gates. This is a proposed experiment, not a capability of the current helper. The earlier six-family MiniWoB holdout remains 1/6 on its old snapshot and was not retested here.

Private raw reports, all failed variants, source snapshots, retry provenance, spend, no-model qualification, scope audits and cleanup records are in `.runs/action-check-20260928/`. Official reward remains unchanged; independent persisted-effect reviews are supplemental and bound to report hashes. Complete verified pairs, incomplete pairs and invalid contaminated comparisons remain separate in the persistent dashboard. Pending versions remain Agent Browser Jev 1.3.0 and Benchmark Improvement Loop 1.1.0. Nothing was committed, published or installed globally.


## Structural evidence and capability campaign (2026-09-29)

The next campaign implemented the preceding proposal: bounded object ownership and parent relationships from a single browser observation, complete-entry context windows, and evidence-linked control context. It also recovered descriptive icon metadata, native numeric stepping, unique observed SVG text, exact line additions preserving the original field, and richer handoff readbacks. These mechanical affordances generalize across labels; opaque visuals, missing input and ambiguous target meaning still require a caller. Jev retains semantic interpretation. No task-ID route or benchmark-sentence rule was added.

All raw variants are retained in `.runs/object-context-20260929/`. Internal v1–v20 names refer to snapshots within pending 1.3.0, not released versions or the preceding campaign's similarly named snapshots. Earlier 42/42 samples remain valid for their exact sources. They do not supersede the following regressions:

| Frozen source / sample | Candidate / baseline | Lesson |
| --- | --- | --- |
| V7, fresh practiced-family MiniWoB |39/42 /41/42 official goals|An auxiliary literal-role veto rejected legitimate discovery prefixes; removed in v8.|
| V9,21 families, seeds1053–1054 |41/42 /41/42 goals;41/42 /40/42 also reported complete|No broad goal gain; one win and one regression.|
| V9, seven new Reddit templates |2/7 /2/7 official full reward|Wrong ranking, incomplete author discovery and destructive replacement remained.|
| V11, edit731/0 first justified retry |1/1 /0/1 official and full goal|Exact append preserved existing text; destructive v9 control failed.|
| V13, three source/author retries |0/3 /0/3 full goals|Three clean handoffs reduced wrong effects but did not increase completed work.|
| V14, ranked-vote714/0 second retry |0/1 /0/1;90 / 17 calls|Removing rejected candidates did not recover the task; experiment reverted.|
| V17,21 families, seeds1055–1056 |40/42 /41/42 goals;39/42 /41/42 also complete|One autonomy regression; one candidate returned after a reached goal.|
| V17, seven fresh Reddit instances |2/7 /3/7 full goals|Wrong preparatory object and empty-search false completion persisted.|
| V19,21 families, seeds1057–1058 |40/42 /41/42 goals|Prefix interpretation and missing native-selection evidence remained.|
| V19, seven further Reddit instances |2/7 /2/7 official;2/7 /2/7 independently verified full goals|Candidate had two scope failures; baseline had one additional unassessed forum-description outcome.|

V18 separately reconsiders a provisional condition only when it conflicts with an otherwise ready immediate action. A practiced selected-card submission recovered, while a 12-case classifier-only diagnostic still had two false vetoes. V19 shares observed input changes with action review, distinguishing prepared text from saved outcomes without an additional model call. It passed27 component, 7 scope and 6 query goals plus their expected negatives. The post-edit 732 retry passed, but its unchanged v17 control failed earlier than before; that isolated win does not prove a causal repair. The fresh 733 post edit also succeeded in v19 while the older baseline returned without acting.

V20 shares native option labels and selected flags across the selector and existing reviews. The browser had recovered names through observed references, but reviews saw unlabeled options in the raw snapshot. On the first justified retry of scroll-list1057, v20 selected Jersey and Bolivia before submitting; unchanged v19 selected only Jersey and falsely claimed completion again. This is a concrete evidence repair, separately followed by fresh seeds and regression checks in the [current scorecard](capability-status.md). A targeted repair is not added to a fresh-sample success numerator.

Two text-edit fixture interruptions remain distinct: a baseline HTTP520 with unknown charge, and a candidate result lost before a failing independent browser readback. The latter is unknown, not a passed negative. Both have retained whole-key usage reserves and reconciled cleanup; the runner now saves paid results and charges before verifier reads. New snapshot directories never reset retry allowances or cumulative spend.

The latest broad WebArena sample uses the third-lowest single-site mutation ID in each of seven practiced Reddit templates: 582,632,637,716,721,728,733; control 399 is excluded. Official partial reward stays unchanged even where an independent persisted-state audit supports a full goal. The baseline's 637 headphones post meets the requested community/title/body; candidate used broader technology despite a dedicated headphones forum. Both falsely claimed all author submissions processed after an empty keyword search in 721, while independent restored-state readback found eight matching submissions. These are failures of target selection and planning, not permission to inject evaluator targets into the helper.

Each scored arm has independently verified restoration. No caller intervened in these benchmark arms. V17's handoff fixtures had 2/3 unassisted positives, one expected negative and 2/2 scripted recoveries; no independent caller LLM or production takeover cost was measured. Use the current scorecard for final source coverage, caller dependence, cost and cleanup; do not combine the best rows across versions.
