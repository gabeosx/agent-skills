> **Historical research evidence.** Agent Browser Jev was archived on October 2, 2026. Results and decisions below belong to their original snapshots; the [final research report](../RESEARCH.md) records the later NO-GO decisions. Installation and automatic campaigns are discontinued.

# WebArena independent-caller comparison

Current studies can use the agent running Codex directly. `tests/webarena-caller-study.mjs` defaults `plan.callerRuntime` to `current_agent`; the historical OpenRouter caller is opt-in via `callerRuntime: "openrouter-api"` and `callerModel: "openai/gpt-5.4"`. This setting is separate from Jev's `typesafe/jev-1.13` model. The historical results below retain their original caller attribution.

The current-agent transport publishes the legitimate goal, installed skill and current UI in `<receipts>/<session>.interactive/request-N.json`, then waits within the trial deadline. Use `node tests/external-caller-control.mjs read DIRECTORY` to read a bounded observation and `--page N` to inspect another capture window. Write a command such as `{"tool":"jev","args":{"values":{"Field":"exact user value"}}}` to a private JSON file, then run `node tests/external-caller-control.mjs respond DIRECTORY --seq N --command-file FILE`. `--resume-latest` binds the actual returned token without printing it. Browser commands use observed references through the existing session; `finish` records a caller assessment, never an evaluator result. Qualification must finish before scored work.

Keep original goals, exact user values and caller interventions visible. Do not read evaluator expectations or another arm's hidden state while acting. A current-agent workflow has additional reasoning and recovery; report it separately from Jev-only autonomy. Caller API requests are zero in this mode, while the current agent's token usage and subscription cost remain unmeasured.


The follow-up completed nine isolated trials on three **practiced WebArena instances**. An independent caller finished two goals; Jev alone finished none; caller-with-Jev finished all three saved goals, with caller recovery on every task. Delegation cost more overall and barely reduced caller decisions. These frozen results precede the readonly-display repair below and are not a score for that changed helper.

## September 30 follow-up

| Across three practiced tasks | Direct caller | Jev alone | Caller with Jev |
| --- | ---: | ---: | ---: |
| Independently verified saved goals with reviewed action scope | 2/3 | 0/3 | 3/3 |
| Full official reward | 2/3 | 0/3 | 2/3 |
| Complete reports | 3/3 | 0/3 | 2/3 |
| Independently contradicted complete reports | 1 | 0 | 0 |
| Non-complete returns | 0 | 3 | 1 |
| Goals requiring caller recovery after Jev | — | — | 3/3 |
| Caller decisions | 54 | 0 | 51 |
| Caller browser gestures | 37 | 0 | 31 |
| Jev browser gestures | 0 | 15 | 10 |
| Total model cost | $0.810555 | $0.025909 | $1.429907 |

The discussion task finished in both caller arms; standalone Jev filled its title then handed back. The direct author-voting caller upvoted **seven of eight** matching posts and falsely reported completion, earning raw reward 8/9. The assisted caller upvoted all eight. Standalone Jev performed no votes. The ranked edit finished correctly in both caller arms; standalone Jev performed only discovery and returned unfinished.

The assisted ranked edit reached the saved goal, then stopped when the next caller-request reservation would exceed the trial's $1 allowance. The pinned effect evaluator passed and the response evaluator failed, yielding official reward **0.5**. This rejection is confirmed from the saved evaluator results and response construction, rather than inferred from a request route. Correct effects, an incomplete report, and official partial reward remain three distinct facts.

Manual command review found no wrong transient field edits, targets or votes in this follow-up. Both completed ranked edits additionally normalized an invalid imported `user_flag` to `none` through the pinned application's hidden form default; neither actor operated a flag control. The first strict database audit marked that metadata change outside scope. Its raw result is retained, with a separate source-backed interpretation and unchanged before/after records. This exception does not authorize unrelated actor effects.

All arms matched a pristine backend before dispatch and restored afterward. No caller saw database targets or evaluator answers. Tasks 623, 721 and 735 had two historical helper executions each, followed by one call in each helper arm here. Their inherited four-call ceiling is exhausted; no further public helper retries or paid probes were performed. The caller received the original goal and exact supplied content, without an end-to-end plan. This bounded browser-tool caller is not the full Codex runtime.

## Readonly display repair and reserved authored transfer

The discussion handoffs exposed a transport defect: a custom readonly textbox displayed the selected forum, while `get value` returned an empty native value. The adapter now reads its visible text through the current browser reference as **separate exact display evidence**. It preserves the native value, readonly checks and Jev's responsibility to assess selection identity. No new classifier or hardcoded forum rule is retained.

On two new authored picker positives, both baseline and candidate completed **2/2** goals with correct scope and complete reports; both also passed a separate absent-target negative. For an already-selected dropdown, calls fell **15 → 8** and browser gestures **4 → 2**, avoiding a redundant same-item selection. The original fixture incorrectly treated that same-value reselection as a scope failure. Raw flags remain preserved; the appended interpretation classifies it as overhead, and the corrected verifier still rejects wrong values and duplicate saves. There is no claimed scope gain from that correction.

Two reserved new authored positive workflows and one separate missing-authority negative were frozen before model trials. The baseline completed **0/2** positive goals; the display repair completed **1/2**, with correct scope and a complete report on semantic forum discovery. Both passed the negative. These are new instances of practiced workflows, not official reward, unseen-family coverage or statistical reliability evidence.

Both versions failed the ranked preserving edit by saving on a lower-rated **nonmatching topic**. Existing text was preserved on the wrong record. A second candidate separated non-comparative membership from rank in Jev's action review. Its third and final allowed attempt withheld the wrong edit but returned unfinished; it failed the predeclared goal-plus-scope promotion criterion and remains experimental. The retained display repair still has this semantic target-selection weakness. The authored saved-edit screen shows a fixed comparison record, so completion behavior after the wrong save has limited interpretation; the independently recorded wrong mutation and its earlier target-selection divergence remain established.

The retained helper passed **27/27 positive components with complete reports**, plus the separate expected absent-target handoff, and **411 offline tests**. No callers intervened in the authored helper lanes. The repair improves a specific observation defect; it does not establish improved public WebArena performance. Further ranking work needs consistent filtered target binding rather than another unchanged retry or an additional broad reviewer.

## Current evidence and accounting

Private evidence is in `.runs/ambiguous-caller-20260930/`: the immutable primary reports, persisted-state and manual scope audits, source manifests, failed no-model reproduction, successful reproduction, qualification records, display pairs, reserved transfer pairs, rejected membership attempt, component regression and metering receipts. The initial renewed negative evaluator control returned raw 0.5 because only its response scaffold passed; it correctly failed full reward. Both control outcomes are preserved.

This renewal measured **$2.305190**, exactly reconciled to provider usage, including **$2.266371** for the primary caller matrix. Conservative cumulative accounting is **$30.931007 / $40**, with older reserves intact and about **$9.06** still available. No new unknown charges remain. The renewed deadline is **September 30, 11:42 AM ET**. The scoped backend and network were removed after a pristine final readback; the persistent [dashboard](http://127.0.0.1:8765/) remains available. Nothing was committed, published or installed globally. Pending skill versions remain **1.3.0** and **1.1.0**.

## Interpreting partial official reward

The pinned task 721 contract contains eight vote checks and one `AgentResponseEvaluator` check. Both historical arms earned 1/9 by passing only the response-contract check; all eight effect checks failed. Independent database lookup confirms eight matching author submissions. Thus **1/9 did not mean one successful vote**. The adapter supplies the response schema separately from Jev's completion report, so that check does not establish either a saved user goal or truthful completion reporting.

Preserve official reward unchanged, inspect its individual evaluator results, and independently count the requested effects. A positive partial reward alone is not evidence of partial browser progress. The pinned contract inspection, historical report hashes, private target lookup and unscored preparation receipts are preserved in the new evidence directory; none of those evaluator records are supplied to the actors.

## Preceding scored matrix

This experiment compares an independent caller using browser tools directly, Jev alone, and the same caller delegating the original goal to Jev and handling its actual return. The frozen 15-trial matrix is complete. The direct caller reached all five saved goals, Jev reached two, and caller-with-Jev reached three. Delegation did not outperform direct execution on this sample; caller effort and incomplete returns remain visible.

The predeclared fresh cohort is tasks **623, 629, 619 and 649**, selected from metadata before opening their goals. They are the four remaining unscored mutation instances in the pinned Reddit subset, all from practiced templates. Every ranked-vote and author-matching mutation instance has already been scored. Task **720** is therefore a separate practiced author diagnostic, with two previous helper executions and at most two new helper executions. It cannot supply fresh-task or unseen-family evidence.

## Frozen first-attempt outcomes

Four tasks were fresh instances of practiced templates; 720 was already practiced. All 15 arms started on distinct fresh backends, matched the pristine reference and restored afterward. Independent database differences and captured mutation requests supplement official reward.

| Case | Direct caller | Jev only | Caller with Jev |
| --- | --- | --- | --- |
| 623, relationship discussion | Full goal, complete report | Full goal, complete report | Full goal, complete report; no caller gestures |
| 629, Pittsburgh discussion | Full goal, complete report | Input required; unfinished | Full goal after five caller gestures; repaired wrong-field edit |
| 619, image repost | Full goal, complete report; repaired wrong-field edit | Handoff; unfinished | Unfinished after caller recovery and two helper invocations |
| 649, data discussion | Full goal, complete report | Full goal, complete report | Full goal, complete report; no caller gestures |
| 720, practiced author task | All three matching upvotes, complete report | Handoff; no votes | Two of three correct upvotes, reward 0.5; unfinished |

All completed goals earned official reward 1. Final persisted changes were correctly scoped, but that does not erase transient wrong actions: the direct caller's image-repost run and the delegated Pittsburgh run filled a display-only textbox, changing a previously focused field, then repaired it. Strict goal-plus-action-scope successes are therefore **4/5 direct, 2/5 Jev, and 2/5 delegated** in this reviewed sample. No completed goal was falsely reported complete in this primary matrix; the three unfinished standalone and two unfinished delegated returns remain failures to complete.

| Total across these five tasks | Direct caller | Jev only | Caller with Jev |
| --- | ---: | ---: | ---: |
| Caller decisions | 65 | 0 | 47 |
| Caller browser gestures | 38 | 0 | 18 |
| Jev browser gestures | 0 | 25 | 28 |
| Model cost | $0.608160 | $0.041865 | $0.904623 |
| Summed trial time | 145.1s | 42.1s | 198.0s |

Lower caller effort did not translate into lower cost or more completed tasks. Costs and times include unfinished trials and are not equivalent-work efficiency measures. This single small sample does not estimate production reliability.

## Cost-stop diagnosis and targeted follow-up

The caller's original scheduling estimate treated every accumulated request byte as an input token. It stopped delegated image and author runs after actual charges of about $0.447 and $0.298, with more than 110 seconds left in each trial. Offline reconstruction reduces their next-call reservations from roughly $0.598/$0.703 to $0.168/$0.214 by retaining the provider's measured unchanged prefix and conservatively counting new bytes. Actual charges remain authoritative; unknown charges still block dispatch, and long-context pricing is accounted for.

A separately qualified image-repost follow-up completed in both caller arms. Retry accounting allowed only one more Jev invocation; the assisted caller took over after that handoff. Both runs again made and repaired the display-textbox wrong edit, so neither passed strict action scope. Both used 19 caller decisions; direct cost $0.208905 and delegated cost $0.325769. Neither would have crossed the old reservation limit on its actual new path. These are useful recovery results, **not causal proof that the cost repair improved completion**, and they do not replace the primary score. No further Jev attempts are permitted on 619 or 720 under this campaign's inherited attempt cap.

The primary matrix cost **$1.554648184** and this follow-up **$0.534673806**, each exactly reconciled to provider usage after its update lag. Conservative cumulative accounting at that checkpoint is **$27.895628266 of $40**, preserving all older reserves. The renewed paid window ends **2026-09-30 01:07:07 UTC**. Later control and reviewer experiments retain separate ledgers.

## Comparison contract

Each arm gets a new backend container and browser, 30 total browser actions and 180 seconds. Both caller arms use GPT-5.4 with low reasoning and the same restricted observed-UI tools and browser refresh guidance. The delegated arm also receives the frozen skill and references, and must delegate the original goal before taking over. The caller can compose authorized missing text and resume useful work; it receives no plan, evaluator answer or database contents.

All caller decisions, gestures, helper invocations and charges are recorded separately. Ordinary caller acceptance is distinct from a recovery action. Jev-only completion and the delegated arm's first helper return remain visible even if the caller later finishes the task. The practiced diagnostic permits one helper invocation per applicable arm; other cases permit up to three invocations within the shared limits.

The primary outcome is a verified finished goal with correct action scope. Official reward, completion reporting, wrong or extra actions, and unassessed scope remain separate. Caller effort and cost are compared after inspecting those outcomes. This is a bounded browser-tool caller, not the full Codex runtime, and the study is not an ablation of handoff history alone.

## Reproduction and evidence

The reusable `tests/webarena-caller-study.mjs` reads a predeclared private `plan.json` with `frozenFirstAttemptCohort` and `practicedDiagnostic` arrays. `--prepare` freezes the helper, caller, guidance and adapter hashes. Qualify backend isolation and both evaluator controls using the [BrowserGym workflow](browsergym-study.md), then run `--qualify` to exercise the frozen caller transport with three scripted positive controls and a negative control. These controls use no model.

Paid execution additionally requires `--deadline` and `--max-usd`. It rotates arm order, verifies frozen sources, and invokes the existing isolation runner once per arm. Individual calls stop on deadline or unknown usage. Results and caller receipts persist before independent readbacks; the private mutation-request audit can reveal transient extra effects that the final database state alone would miss. A single-arm report is labeled `single_arm_recorded`, never a paired win.

Private plans, source manifests, qualification failures and results live in `.runs/webarena-caller-20260929/`. The first scripted transport check failed because accessible labels included leading whitespace; it incurred no model charge and remains preserved. Two later controls encountered existing sidecar output files and remain incomplete; uniquely named controls passed afterward. The qualification selector was repaired without changing the scored caller or Jev's control policy. Existing release **1.3.0** remains pending.

The setup retains BrowserGym 0.14.3, WebArena-Verified 1.2.3, agent-browser 0.38.1 and the previously pinned Reddit image. The official [WebArena-Verified project](https://github.com/ServiceNow/webarena-verified) describes deterministic evaluation over agent responses and captured network traces; the local persisted-state scope audit supplements that reward without modifying it.

## Qualification and provenance

Before scoring, three scripted positive caller arms earned full reward and independently saved the requested biography; the negative preserved the original biography with zero reward. Dirty-start blocking and mutation/readback/replacement/restoration checks passed. Every paid arm then independently verified its own clean start and restoration. The cost-follow-up harness was requalified after the metering change.

The primary frozen source passed 368 offline tests. Subsequent fixes have separate validation receipts; those results do not retroactively change a frozen score. The original pending-authorization checkpoint, failed qualifications, raw reports and all charges remain preserved under `.runs/webarena-caller-20260929/` and `.runs/webarena-cost-20260929/`. The [architecture review](architecture-review.md) interprets this result alongside earlier ablations without turning code-review suggestions into proven improvements.
