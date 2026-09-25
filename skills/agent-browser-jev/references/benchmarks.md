# What we measured

The published numbers answer three different questions. The **gym** measures this helper's own work on disposable pages. The **same-stack comparison** runs this helper and one compatible open-source rival on identical component tasks. The **Codex comparisons** measure complete agent tasks, including the calling model's time and tool use. None predicts performance on every website or establishes a universal ranking.

## Published browser gym

Run September 25, 2026, with the 1.0.0 skill, Node 26.5.0, agent-browser 0.33.2 and Chrome for Testing 151. The gym invoked the direct agent interface, including encrypted-token resume, with real Jev calls and real browser actions on local pages. Assertions inspected page events, saved form data, selected record IDs and final screens independently of Jev's completion claim.

| Case | Independent result | Helper time | Reported Jev charge |
| --- | ---: | ---: | ---: |
| 12-action report draft | 2/2 | 4.53 s | $0.000980 |
| Missing input, then token resume | 2/2 | 4.50 s across calls | $0.001038 |
| Action limit, then token resume | 2/2 | 3.92 s across calls | $0.001049 |
| Keyboard search and back | 2/2 | 1.62 s | $0.000275 |
| Scroll to reveal a control | 2/2 | 0.81 s | $0.000135 |
| Clickable autocomplete | 2/2 | 2.47 s | $0.000494 |
| Keyboard-only picker safely handed off | 2/2 | 3.64 s | $0.000786 |
| Six short scenarios, twice each | 12/12 | 0.24–0.99 s median by scenario | $0.001972 total |

All **52/52** checks passed in this run; the combined provider-reported Jev charge was **$0.016679**. The twelve short-scenario trials cover a missing target, reordered articles, a form left unsent, preferences, search and navigation. Each non-component case ran twice; the component cases ran once. For the keyboard-only picker, a pass means the helper stopped without committing either similar record; it does not mean Jev completed that widget. Two observations per repeated case are still too few for a reliability estimate. The charge column shows the mean per run except where labeled total.

“Helper time” is measured inside the helper invocation and excludes Node startup, the calling agent, opening the fixture before some cases, and the independent assertion. The gym also records each suite's wall time, including its setup and checks. It does not estimate a GPT bill or compare against manual browser control. [Run summary with source hashes and every outcome](evidence/gym-1.0.0.json).

Reproduce with a new output path; the adjacent `.details` directory retains full local fixture evidence:

```sh
npm run gym -- --output /absolute/path/to/new-gym.json --rounds 2
```

Use `--suites workflow,autocomplete,scenarios,components` to select suites and `--binary /path/to/agent-browser` to use a particular installation. The gym keeps failures, unknown charges and cleanup status. Its pages and records are synthetic. It runs only this helper; a fair open-source comparison needs adapters and equal starting states for the other projects.

The first 1.0 release candidate run passed 50/52: both keyboard-only picker trials committed the first similar record instead of the requested second record. The helper now withholds autocomplete arrow/Enter selection and returns control when accessible clicks cannot commit the choice. The failed run is [retained with its wrong record IDs and traces](evidence/gym-keyboard-failure-1.0.0.json); a focused [post-fix replay](evidence/autocomplete-safe-handoff-1.0.0.json) and both final gym rounds established the safe boundary.

## Common component matrix

The component gym translates the interaction inventories in WAI-ARIA APG, Base UI, Radix Primitives, MUI and shadcn/ui into 26 original local fixtures. It covers disclosure, navigation, menus, overlays, selection, data display, workflow, feedback, input and safe absent-target handling. Third-party component code is not copied and public demo sites are not loaded. [Coverage and source inventories](component-gym.md) document the selection.

The final September 25, 2026 run used real Jev calls, agent-browser 0.33.2 and Chrome for Testing 151. Positive cases passed only when a server-side completion record contained the exact expected structured state and the final accessibility snapshot established completion. The absent-target case passed only when the helper returned `handoff` without recording a completion. File upload used a temporary synthetic PDF and hover used an observed hint plus a grounded control.

| Family | Independent result |
| --- | ---: |
| Disclosure | 1/1 |
| Navigation | 4/4 |
| Menus | 2/2 |
| Overlays | 6/6 |
| Selection | 6/6 |
| Data | 2/2 |
| Workflow | 1/1 |
| Feedback | 1/1 |
| Input | 2/2 |
| Safe absent-target boundary | 1/1 |

All **26/26** cases passed in the 1.0 gym. Total provider-reported Jev charges were **$0.005191**. Individual helper invocations ranged from 0.27 seconds for a handoff to 3.83 seconds for the tree view in this run. These are one-trial functional checks, not a reliability estimate. [Final report with source hashes, traces, exact outcomes and cleanup](evidence/gym-1.0.0.details/components-1.json).

The retained development run passed 25/26 and exposed a fixture collision between an element ID and the browser's built-in `window.open`; it is excluded from the passing count. An earlier command-palette run also exposed a real helper weakness: an asynchronous click completed after the first changed snapshot, so Jev saw a stale selected option and clicked it again. The helper now takes a bounded quiescence observation when a clicked ref remains present, and it reads back once after an uncertain action without replaying it. A later comparison showed that the old hover boundary could be completed safely and that uploads were a material missing action. The helper now offers contextual hover and exact caller-path upload; both final cases passed. [Early development report](evidence/component-matrix-development-0.4.0.json) · [pre-upload matrix](evidence/component-matrix-pre-upload-0.4.0.json).

Reproduce the matrix alone with a new path:

```sh
npm run gym:components -- --output /absolute/path/to/new-components.json
```

## Controlled same-stack project comparison

The new cross-project runner compares this skill with [forvela/jev-agent-browser](https://github.com/forvela/jev-agent-browser) because both can use the same OpenRouter Decisions endpoint and agent-browser executable. The recorded run pinned the competitor to commit `b4d4e0284a4b0336f12831ef6fe64ba5d29b1efb` (package 0.1.7), used `typesafe/jev-1.13`, agent-browser 0.33.2 and the same 26 starting pages, goals, action limit and hidden outcome checks. Run order alternated by case. Navigation was inside both measured invocations.

| One full 26-case round | This skill | forvela/jev-agent-browser |
| --- | ---: | ---: |
| Independently verified outcomes | 26/26 | 11/26 |
| Median invocation time, all outcomes | 1.55 s | 1.04 s |
| Median invocation time, passed outcomes | 1.55 s | 1.94 s |
| Provider-reported charge | $0.005192 | unavailable from its public result |

The rival passed accordion, alert-dialog, toggle-button, pagination, sortable-table, drawer, carousel, delayed feedback, breadcrumb, missing-target and hover-card cases. Its 15 misses clustered around roles excluded from its current click target space (`tab`, menu roles, `radio`, `option`, `treeitem`, checkbox and spinbutton), exact-value binding, and file upload. Several misses stopped safely; multi-select, radio-switch and tri-state runs sometimes submitted the wrong structured state, which the hidden verifier rejected.

The recorded 1.0 full round again produced **26/26 versus 11/26**. During pre-release work, the 15 differential cases also ran **two additional rounds**: this skill passed **30/30** and the comparison arm passed **0/30**, giving three observations per differential case across those earlier runs. That consistency supports a coverage advantage on this matrix; it is still not a broad reliability rate or proof of overall ecosystem leadership. [1.0 full round](evidence/cross-project-components-1.0.0.json) · [two-round differential replay](evidence/cross-project-components-repeats-0.4.0.json) · [pre-improvement development run](evidence/cross-project-components-development-0.4.0.json).

Reproduce with a fresh checkout and output path:

```sh
git clone https://github.com/forvela/jev-agent-browser /tmp/forvela-jev-agent-browser
npm --prefix /tmp/forvela-jev-agent-browser install --ignore-scripts
npm run benchmark:projects -- \
  --competitor-dir /tmp/forvela-jev-agent-browser \
  --output /absolute/path/to/new-cross-project.json
```

The direct-TypeSafe projects reviewed alongside it could not be run with the available OpenRouter credential without changing their provider contract. They were recorded as research inputs, not benchmark losses. The runner currently supports the one same-stack adapter and refuses an unexpected package name.

## Seeded travel challenge

`npm run gym:generated -- --output /absolute/path/to/new-generated.json --seed 1234 --cases 3` creates a fresh, fake multi-page booking per seed. The caller sees a natural-language goal, exact values and starting URL, reads this skill, then gives Jev the whole goal. It can inspect the final page but cannot take over browser gestures. Airport fields require selecting delayed suggestions; results include flights with a wrong time, airline or cabin; the traveler form has required values below the fold and conditional checked baggage; review requires accepting demo terms. Seeds vary the date control between native and validated text input. No payment or real booking occurs.

The server retains the answer key and checks the actual selected airport codes, flight ID, traveler values and final hold. The isolated caller is instructed not to inspect fixture code or reports. The report records the seed, source hashes, caller command counts and GPT tokens, Jev's reported cost, elapsed whole-task time, mismatches and cleanup. A seed makes a failure replayable; using new seeds tests variation rather than repeating a hand-tuned page. These generated challenges supplement the fixed gym. They are not a head-to-head against another product or a statistical reliability claim.

The 1.0 release run generated three previously untested consecutive seeds at runtime. All **3/3** reached the independently verified fake hold without caller browser gestures:

| Seed and date control | Independent outcome | Whole task | Helper work | Jev charge |
| --- | --- | ---: | ---: | ---: |
| 1573558718 · native | Held correct itinerary | 28.8 s | 17 actions · 6.6 s | $0.002741 |
| 1573558719 · text | Held correct itinerary | 24.3 s | 17 actions · 5.6 s | $0.002788 |
| 1573558720 · native | Held correct itinerary | 24.5 s | 18 actions · 5.9 s | $0.003023 |

The median whole-task time was **24.5 seconds** and combined provider-reported Jev charges were **$0.008552**. All three challenges included delayed airport suggestions, three flight decoys, below-fold traveler inputs, conditional baggage and a review checkbox. [Full 1.0 report with seeds, hidden-verifier outcomes, caller tokens, traces and cleanup](evidence/generated-travel-1.0.0.json).

Initial strict trials on September 25, 2026 used Codex GPT-5.5 low effort as the caller, Jev through OpenRouter and agent-browser 0.33.2. The caller supplied all exact values and was limited to a final readback after Jev's single invocation.

| Seed and challenge | Independent outcome | Whole task | Jev charge |
| --- | --- | ---: | ---: |
| 1234 · native date, checked bag | Failed at search; 46 waits in 60 actions | 47.5 s | $0.018699 |
| 1235 · text date, no bag | Held correct itinerary | 30.6 s | $0.005053 |
| 1241 · text date, checked bag | Held correct itinerary | 35.2 s | $0.003541 |

This is **2/3** independently correct outcomes over three selected seeds, not a reliability rate. The native-date case never submitted the search form. The successful cases passed through airport suggestions, a decoy-filled results page, traveler details and review without caller browser gestures. The 1241 result was replayed on the final harness source. The earlier corrected pair and final replay are preserved with source hashes, actions, tokens, costs and failed assertions: [paired seeds](evidence/generated-travel-pair-0.4.0.json) · [final replay](evidence/generated-travel-final-0.4.0.json). Earlier [caller-recovery](evidence/generated-travel-development-0.4.0.json), [missing-values](evidence/generated-travel-no-values-0.4.0.json) and [sandbox setup](evidence/generated-travel-setup-0.4.0.json) attempts are retained but excluded from that count.

The original native-date failure led to a browser-control fix. Agent-browser's `fill` command reported success on Chromium's virtual date spinbuttons without changing the input. A direct UI test confirmed that clicking the observed Month, Day and Year refs and pressing the exact supplied date digits sets the value. The helper now offers that as one bounded date action. It also stops offering `wait` after five unchanged waits, leaving other observed controls or handoff available.

On the final corrected source, both replayed seeds passed without caller browser gestures: native-date seed 1234 took **24.0 s**, **18 actions** and **$0.003211** in reported Jev charges; text-date seed 1235 took **26.9 s**, **17 actions** and **$0.003036**. Both reached the independently checked fake hold. [Final paired replay](evidence/generated-travel-after-fix-0.4.0.json) includes hashes of the controller and browser adapter, actions, caller tokens and scoped cleanup. An [intermediate failed attempt](evidence/generated-travel-datefix-development-0.4.0.json) showed that fixing date entry alone still left the uncommitted airport selections; it is retained separately. Two passing replays establish this fix on these seeds, not a general reliability rate.

## Complete Codex task: a multi-screen report

A previous comparison used 0.3.0 of this skill. Three fresh Codex GPT-5.5 low-effort sessions per arm each created one report draft. Both arms used the same agent-browser and Chrome build. The task included text entry, project and region dropdowns, two checkboxes, frequency, review, save and return to the list. A Publish action was visible but out of scope. The callers did not see fixture code, expected references or the verifier.

| Three paired trials | Codex + agent-browser | Codex + Jev |
| --- | ---: | ---: |
| Median complete-task time | 69.6 s | 15.9 s |
| Independently verified outcomes | 3/3 | 3/3 |
| Estimated model cost across three trials | $1.606 | $0.346 |

The 4.4× timing difference is for **this one 12-action workflow**. Timing began at task delivery and ended at caller assessment. It includes navigation, model/tool orchestration and browser actions, but excludes Codex process startup and the harness's final assertion. The cost figures are API-equivalent estimates based on recorded GPT input, cached input and output tokens, plus Jev's reported $0.002634. They are not Codex subscription charges or invoices. The three pairs ran concurrently on one host; the first overlapped a separate acceptance run. [Full trial data](evidence/codex-workflow-0.3.0.json) · [Cost arithmetic and assumptions](evidence/workflow-metrics-0.3.0.json).

## Complete Codex task: six shorter jobs

The earlier 0.2.1 comparison ran six help-center, form, settings and search tasks in three paired rounds. Both arms used actual isolated Codex sessions and the same browser. Direct Codex passed **18/18** strict checks; Codex with Jev passed **16/18**. The assisted median was **17.9 s** versus **20.0 s** direct. Its estimated combined model cost was 15.5% lower. In two preferences trials, the setting was saved, but the caller reopened the settings dialog during verification, failing the required final-screen check. All failures were retained.

This result matters alongside the report-workflow win: when the helper saves only a few model turns, caller startup and verification can dominate the task. [Trial data](evidence/codex-comparison-0.2.1.json) · [Derived costs](evidence/comparison-metrics-0.2.1.json). The original 0.2.0 run and development attempts remain in the [evidence directory](evidence/).

## Searchable dropdowns remain a challenge

The autocomplete tests use similar-looking contacts and accounts. The site stores selected record IDs separately from typed query text, and the checker compares those IDs. Earlier runs committed wrong keyboard choices, including both keyboard-only cases in the first 1.0 release-candidate gym. The helper now clicks accessible matching options but withholds arrow/Enter selection from autocomplete fields. In the final 1.0 gym, clickable selection passed twice and the keyboard-only picker safely handed off twice without committing a record. [Final 1.0 run](evidence/gym-1.0.0.json) · [Retained 1.0 failure](evidence/gym-keyboard-failure-1.0.0.json) · [Historical development attempts](evidence/autocomplete-development-0.3.1.json).

Use direct agent-browser control and verify the committed record when a widget requires keyboard-only selection. A displayed query is not proof that a record was selected. The helper's `reported_complete` is never the independent outcome check.

## Reproduce the Codex comparison

The gym needs an OpenRouter key and agent-browser. The full comparison also needs a signed-in Codex CLI account. These commands make live model calls; choose a new output path each time.

```sh
npm run benchmark:codex -- --suite workflow --rounds 3 \
  --output /absolute/path/to/new-comparison.json
npm run test:autocomplete -- --output /absolute/path/to/new-autocomplete.json
```

The comparison runner records task prompts, source hashes, browser commands, model usage, Jev charges, independent UI outcomes and cleanup. Browser version, model settings and measurement boundaries appear in each report. If a browser build stalls or a provider fails, retain that attempt as a failure or incomplete run; do not fold it into a successful median. A browser-only gym result, a whole-Codex result and another project's demo should not be compared as if their clocks were the same.
