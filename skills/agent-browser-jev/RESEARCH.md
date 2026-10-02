# Agent Browser Jev: an archived browser-delegation research study

**Status:** archived; installation and further automatic campaigns are discontinued.

**Report date:** October 2, 2026.

**Evidence window:** the retained development and evaluation record through October 1, 2026, including the early published trials and final NO-GO pilots.

**Archive contract:** 2.0.0. The preserved executable package is the 1.3.0 research snapshot prepared before archival; campaign-local candidate numbers identify different frozen implementations, not released package versions.

**License:** [MIT](LICENSE).

## Abstract

We investigated whether a small decision model could handle a coherent browser task inside one delegated invocation, reducing the stronger calling agent's repeated observe–decide–act turns. The implementation combined `typesafe/jev-1.13`, OpenRouter decision requests and an existing agent-browser session. Jev selected among observed controls and bound meaning to exact supplied or observed values; ordinary code executed gestures, copied text, performed bounded arithmetic and preserved continuation state. The calling agent retained authorization, missing content and final acceptance.

Early authored tasks demonstrated the attraction of this arrangement. A twelve-action report workflow succeeded in three trials per arm and reduced median complete-task time from 69.6 to 15.9 seconds. A 26-case synthetic component comparison showed substantially greater functional coverage than one pinned compatible implementation. These results motivated broader work on unfamiliar layouts, public benchmark tasks, target discovery, picker commitment, arithmetic, repeated effects and independent caller recovery.

Broader evaluation changed the conclusion. Strong practiced-family scores did not transfer consistently: a separately selected twelve-family MiniWoB sample scored 1/12 in both arms; a later frozen 78-instance evaluation scored 60/78 for the earlier controller and 59/78 for the retained candidate. On WebArena-Verified, exact goals, scope and completion reports frequently disagreed with one another and with official reward. Caller assistance sometimes recovered tasks or reduced gestures, but several matched caller studies cost more than direct execution. Additional same-model reviews could introduce contradictory vetoes, premature completion or wrong targets.

Narrow improvements were real, including mechanical readonly protections, exact value binding, eligibility before ranking on authored collections, calendar calculations and better historical handoff evidence. A nine-task, report-heavy Shopping Admin comparison improved standalone official completion from 0/9 to 3/9, but its paired p=0.25 and low absolute completion did not establish broad reliability. The subsequent broad campaign encountered a new wrong-field mutation and false completion. Its 48-task confirmation cohort was never run. The final bounded controller screen and two architecture pilots ended in explicit NO-GO decisions.

The retained evidence supports useful mechanisms and limited workload-specific delegation benefits. It does not support distributing this implementation as a generally reliable browser skill. We therefore archive the skill, preserve the source and failures for research, and remove its installer entrypoint. This report is a retrospective synthesis, not a new benchmark run or a pooled success rate.

## 1. Questions and system design

The central question was whether moving browser micro-decisions into a smaller model would improve complete-task efficiency without losing exact outcomes, scope or honest reporting. We also investigated:

1. Which browser mechanics can code preserve reliably while leaving semantic interpretation to Jev?
2. Does adding planning, memory, semantic review or factored decisions improve completion?
3. Can exact values, relative calculations and fixed target identities reduce stronger-model intervention?
4. How much caller work remains after a handoff, and does delegation reduce total effort or cost?
5. Do improvements survive fresh instances, changed wording, broader families and public applications?

The architecture had four responsibilities:

| Layer | Responsibility | Important limitation |
| --- | --- | --- |
| Calling agent | Original goal, authorization, known values, missing prose or facts, acceptance and recovery | Reasoning or supplying derived values is assistance even with zero caller gestures |
| Jev controller | Interpret current observations, choose grounded actions, bind targets/fields/sources and assess progress | Choices and reviews remain fallible model judgments |
| Browser/value mechanics | Execute observed references, preserve exact bytes, read current state, compute conditional arithmetic, maintain ledgers and encrypted continuation | Correct mechanics cannot prove that a semantic binding or target set is correct |
| Evaluation harness | Fresh starting state, hidden outcome checks, official scoring, persisted/transient scope audits, receipts and cleanup | Harness defects or missing readbacks can invalidate or limit an apparent result |

The original helper exposed a bounded action space rather than generated JavaScript. Later work added structured object ownership, capture windows, native control state, exact goal spans, supported relative numeric relationships, explicit-date calendar calculations, fixed-set execution and richer handoff evidence. Unsupported composition, visual-only interaction, authentication and some pickers remained caller boundaries. Resume observed the page again and retained authority; it did not replay old references.

The offline source remains in [scripts](scripts/) and [tests](tests/). The former operating instructions are preserved as [historical instructions](SKILL.archived.md), with an archive notice and no installable `SKILL.md`. Detailed mechanics are recorded in [helper behavior](references/helper-behavior.md) and the historical [invocation contract](references/usage.md).

## 2. Evaluation method and terminology

No single metric captured the behavior we cared about. The experiment record increasingly separated the following outcomes:

| Term | Meaning in this report |
| --- | --- |
| Official full reward | The benchmark returned its full success value, typically reward=1; relevant studies also required done=true |
| Independently reached goal | A server, UI, trace or persisted-state readback established the exact requested outcome |
| Correct action scope | The audit established the requested target set and checked wrong or extra effects, including transient edits where available |
| Strict completion | The study's exact goal/scope criteria plus a complete helper report and no caller rescue; consult the individual protocol |
| Rewarded return | The outcome was reached, but the helper returned control without a complete report |
| False completion | A completion claim was contradicted by the independently observed unfinished or wrong state |
| Safe negative | An unavailable or unauthorized outcome was withheld without forbidden effects; this is counted separately from positive completion |
| Unassessed | The evidence did not establish the relevant field, scope, suitability, persistence or complete outcome |
| Assisted completion | Another model or the caller advanced unfinished work through reasoning, supplied content/values, navigation, gestures or continuation |

Early gym totals sometimes include safe negatives and resume checks. They must not be read as counts of autonomous positive tasks. Later public scores often measure official reward without globally complete semantic-scope audits. A full reward cannot fill a missing audit field, and a handoff does not guarantee harmless execution.

### Evidence lanes

* **Authored local fixtures:** original synthetic pages, independent server events and exact saved state. Useful for mechanism diagnosis and counterexamples; susceptible to author familiarity and fixture mistakes.
* **Generated travel:** seeded fake bookings with decoy flights, delayed airport choices, traveler data and hidden final checks. The caller could inspect the result but could not finish the booking with gestures.
* **Same-stack project comparison:** identical local pages, goals, model/provider/browser stack and hidden checks against one pinned competitor. This measures that version on that matrix.
* **Actual Codex comparisons:** isolated Codex sessions measuring complete task delivery through caller assessment. Their clocks and estimated costs differ from helper-only studies.
* **BrowserGym MiniWoB:** pinned public task implementations and official reward, initially 21 practiced families and later 39 supported families. New seeds test instance variation; they do not erase family practice.
* **BrowserGym-core integration:** three original multi-page tasks (`contact-copy`, `preferences`, `review-approval`), scored by BrowserGym task classes. These are authored integration tests, not an external benchmark result.
* **WebArena-Verified:** selected Reddit and Shopping Admin browser-control tasks, official evaluators, isolated backends and supplemental state/scope audits. These are scoped cohorts, not full WebArena.
* **Independent caller studies:** bounded API callers with legitimate goals and browser tools, sometimes paired with Jev. Later RC work used the current Codex agent instead, with larger assisted budgets and unmeasured caller subscription cost.

The later benchmark stack recorded BrowserGym 0.14.3, WebArena-Verified 1.2.3, MiniWoB++ commit `7fd85d71a4b60325c6585396ec4f48377d049838`, agent-browser 0.38.1 and Jev 1.13. The early published gym instead used agent-browser 0.33.2 and Chrome for Testing 151. Source fingerprints and revisions belong to each report; these descriptions are historical environment records.

### Freezing, audit and correction

Paired actors received the same goal and starting state, with alternated order where specified. Later campaigns froze controller sources, harnesses, case selection, seeds, budgets and promotion rules. Started failures, provider errors, interrupted calls and targeted retries were retained. A corrected development case never silently replaced a primary frozen result.

For WebArena, backend replacement and independent clean-state checks became mandatory before every arm. Dirty-start rejection, both reset orders and known positive/negative evaluator controls qualified the harness before paid calls. Hidden database state, evaluator expectations and diagnostic routes stayed outside actor inputs. The campaign ledger retained dispatches, receipts, source hashes, report-bound audits and scoped cleanup.

Important corrections include contaminated historical resets, impossible pagination fixtures, legitimate lookup preparation incorrectly labeled as record mutation, ambiguous ranking/date goals, official matcher exceptions and incomplete scope projections. Corrections were attached to the original evidence rather than silently rewriting reward. The [campaign method](references/browsergym-campaign.md), [BrowserGym adapter](references/browsergym-study.md) and [evidence register](EVIDENCE.md) document these boundaries.

## 3. Early results: why we continued

| Early experiment | Result | Interpretation |
| --- | --- | --- |
| Six shorter Codex jobs, three paired rounds | Direct 18/18 strict checks; delegated 16/18; medians 20.0s versus 17.9s; estimated cost 15.5% lower | Small time gain; two final-screen verification failures remained |
| Twelve-action report, three trials per arm | 3/3 each; 69.6s direct versus 15.9s delegated; estimated model cost $1.606 versus $0.346 across each arm's three trials | Large workload-specific orchestration gain, not a general speed claim |
| Final 1.0 gym | 52/52 checks; reported Jev charges $0.016679 | Includes resume and safe-boundary checks, not 52 autonomous positive workflows |
| Common-component matrix | 26/26 in the published 1.0 run | One-trial synthetic functional coverage |
| Generated travel, final release run | 3/3 new seeded fake holds; median whole-task time 24.5s; reported Jev total $0.008552 | Small authored sample with exact values and no caller gestures |
| Pinned same-stack competitor | Jev helper 26/26 versus `forvela/jev-agent-browser` 0.1.7 at 11/26; fifteen differential cases repeated twice: 30/30 versus 0/30 | Functional coverage advantage on the selected synthetic matrix |

The report workflow's cost was an API-equivalent estimate derived from GPT token records plus Jev charges, not a Codex subscription invoice. Its timing included caller orchestration but excluded CLI startup and the independent final assertion. The shorter-task failures involved reopening an otherwise saved preferences dialog, violating the required final screen. These distinctions matter when interpreting delegation overhead.

The component comparison pinned the competitor to `b4d4e0284a4b0336f12831ef6fe64ba5d29b1efb`. Its misses clustered around excluded accessible roles, exact-value binding, selection and upload. Its lower median across all runs included failures; comparing successful-task latency gave a different picture. Other projects could not be fairly scored with the available credentials or equivalent runtimes, so they were research references rather than benchmark losses.

Failures were useful even at this stage. The initial 1.0 gym passed 50/52 because keyboard-only pickers committed the wrong similar records. Withholding unsafe keyboard commitment converted those cases into correctly assessed handoffs. Generated travel initially passed 2/3; the native-date failure exposed a browser command that reported success without changing the field, and an intermediate date repair still left airports uncommitted. Later passing replays established repairs on those seeds, while the failed attempts remained.

Sources: [published benchmark methods and raw JSON links](references/benchmarks.md), [component coverage](references/component-gym.md), [project research](references/published-evidence.md).

## 4. Generalization exposed the limits

The first general refactor deliberately removed benchmark sentence recognition and fixed website routes. Under common frozen transport, it regressed sharply: the 1.2.1 baseline reached 41/42 MiniWoB goals while the candidate reached 33/42, with eight paired regressions, no wins and four false completion reports. Autocomplete, menu completion, slider overshoot, tree exploration and long agreement scrolling failed. Cheaper runs often stopped early. This refactor failed its gate.

Subsequent general repairs recovered practiced tasks, but results varied by seed and snapshot. A frozen practiced-seed source reached 42/42, then 38/42 on fresh seeds; the next source reached 39/42 against 38/42. Targeted successes were kept apart from those frozen matrices. Later structural-evidence v20 reached 41/42 against 39/42 in 21 practiced families, yet a metadata-selected twelve-family sample reached only 1/12 in both arms. Input extraction, visual controls and planning remained gaps.

The intervening campaigns also show why apparently strong checkpoints needed qualification:

| Historical campaign | Frozen or audited result | Boundary that remained |
| --- | --- | --- |
| Handoff improvement | Practiced-family transfer 40/42→42/42; six local checks included two scripted recoveries | Its WebArena pilot was reset-contaminated and invalid; scripted recovery was not an independent caller result |
| Isolation repair | Four known Reddit tasks tied 2/4 official goals; only 1/4 goals with correct action scope in each arm | Two false completions and three scope failures in each arm; improved evaluation, unchanged reasoning |
| Target-scope campaign | Eight practiced Reddit tasks: official 3/8→5/8, independently scope-correct goals 2/8→6/8 | One false completion, one interpretation unassessed; MiniWoB reporting regressed despite reward ties |
| Requirement interpreter | Practiced MiniWoB 42/42 in both arms; six-family holdout 1/6 in both | Reddit official 5/8→4/8 and scoped goals 6/8→5/8; no transfer improvement |
| Action review, final v12 | Practiced MiniWoB 38/42→40/42; three unopened Reddit instances tied 3/3 official rewards | Only 2/3 Reddit goals were independently scope-correct, with review-body meaning unassessed; candidate calls/cost increased |

These counts belong to their individual snapshots and selected cohorts. The [historical comparison audit](references/archive-trials/historical-run-review.md) additionally found an older qualified controller with 6/8 official Reddit rewards, but an extra unrequested vote and two failed targeted regressions. Selecting a weak recent comparator or combining the strongest historical rows would misrepresent the evidence. Complete checkpoint accounts are linked in the [campaign register](EVIDENCE.md#campaign-inventory).

The broader September 30 release evaluation is especially informative: 39 supported practiced families, two unused seeds, 78 pairs and 156 episodes, with zero caller intervention.

| Frozen release-evaluation metric | Earlier Jev | Retained candidate |
| --- | ---: | ---: |
| Full official reward | 60/78 | 59/78 |
| Full reward and complete report | 55/78 | 55/78 |
| Rewarded incomplete returns | 5 | 4 |
| Complete reports without full reward | 0 | 0 |
| Requests / actions | 803 / 231 | 801 / 228 |
| Model cost | $0.105504 | $0.105001 |

There were 77 reward ties, one candidate regression and no candidate wins. Both missed eighteen instances in nine families, including drawing, image-only controls, dragging, food ordering and phone lookup. Scope was not globally audited. Earlier perfect smaller samples do not establish a complete MiniWoB score.

Shopping Admin transfer was weaker. Six new development templates tied 1/6, two reserved templates tied 0/2, and a separate six-instance frozen release comparison tied 1/6. Some timing fixes reached the requested price but cleared an unrequested price elsewhere. An initial-settling variant completed one price task yet regressed on another, filling the wrong search field and saving an unchanged description while price became NULL. No-model unchanged-Save controls reproduced application default materialization and price clearing. Those controls explain application behavior; they do not erase the actor's premature commit or extend authorization.

A server response saying “We cannot add order history” also showed why HTTP 200 or filled fields cannot establish completion. The pinned workflow exposed an empty Status selector. Environmental limitations and false completion remained separate findings.

Sources: [general-refactor and improvement summaries](references/archive-trials/miniwob-refactor.md), [general-improvement history](references/archive-trials/miniwob-general-improvement.md), [snapshot scorecard](references/capability-status.md), [public transfer](references/public-transfer-study.md), [frozen release evaluation](references/release-evaluation.md).

## 5. Controller experiments and what they taught us

### Grounding, observations and value binding

Structured object context retained observed controls, ownership and parent relationships rather than prescribing site workflows. Capture windows made large observations inspectable, but observing every window of one capture did not prove website coverage. Native selected options, readonly display text and noninteractive save feedback needed to reach the same downstream reviews that judged progress.

A flat grounded action selector remained the foundation. A short operation/target factorization reached 4/7 positive value fixtures versus 6/7 for flat selection and falsely completed three positives. Restoring full instructions tied 6/7 but added calls and cost. A later Reddit comparison reached 1/7 versus 2/7 full rewards. This rejected the tested factorization, not every possible fan-out design.

Preparing exact field bindings earlier was more promising. A revised local comparison preserved 6/7 positives and three negatives while reducing requests from 78 to 64 and measured cost by about 21%. On 39 practiced MiniWoB families it reached 29/39 versus 28/39, but requests and cost increased slightly. Local savings did not transfer into a general efficiency claim.

Mechanical picker repairs addressed independently reproduced faults. Filling an ARIA-readonly display could send text into the previously focused field while the browser reported success. Observed readonly state and immediate pre-dispatch checks withheld that fill. Nearby MiniWoB regressions tied 9/11; editable pickers still sometimes submitted an uncommitted query and falsely completed. Field-specific custom-picker bindings improved one authored cohort 3/4→4/4 at roughly 17% higher cost. Detached suggestion gains were similarly small and source-specific.

An extra destination classifier later tied 5/6 correct authored goals while increasing requests 64→70. Renaming a supplied prefix did not recover the failed picker. The classifier was rejected. A separately reserved picker succeeded standalone and with either caller arm, but assisted recovery cost more than direct execution.

Sources: [decision primitives and value binding](references/published-evidence.md#using-jevs-decision-primitives), [picker commitment](references/picker-commit-study.md), [readonly mechanics](references/control-affordance-study.md), [field-binding study](references/field-binding-study.md).

### Planning, memory and repeated semantic reviews

| Authored discovery controller | Correct positive goals | Wrong effects | Calls including the separate negative |
| --- | ---: | ---: | ---: |
| Current v10 at that checkpoint | 7/7 | 0 | 74 |
| Reduced context | 6/7 | 0 | 73 |
| Reduced context plus stage/target memory | 5/7 | 0 | 94 |
| Full context plus memory | 6/7 | 0 | 103 |
| Shared stage/target state with review | 7/7 | 0 | 104 |
| Semantic reviews removed | 6/7 | 1 | 32 |

The cheapest variant subscribed to an insufficiently established ranked target and falsely completed. Shared state tied v10 on public development (3/7) and unopened practiced-template instances (2/7), with more calls. A focused target/peer projection scored 4/10 on a decision diagnostic versus 9/10 with fuller evidence. Shorter action-review wording later tied authored cases but lost autocomplete on a five-family public regression, 4/5 versus 5/5; the remaining 34-family continuation was interrupted by a process-limit failure and remained unscored.

An independent planning experiment compared unchanged restarts with up to two GPT-5.4-mini interventions under a common total budget. Neither earned full official reward on the three practiced failed tasks. Assistance reached one independently verified author goal, but another task downvoted an extra fifth-ranked item while missing a required third target. Its five planner calls and $0.034554 were additional to 253 Jev calls and $0.109823. Planner advice helped one discovery route but did not reliably own scope.

Expanded transition history, inspection memory and advisory target sets also failed to improve aggregate browser completion. In two large author collections, memory reduced inspections 140→78 and increased correct partial likes 6/16→8/16, yet both arms completed 0/2. Separate membership and arithmetic diagnostics improved some labels and sets, while downstream reviews still rejected a correctly bound remaining target or accepted a wrong collection. Correct advisory facts were insufficient without consistent authority across selection, review and completion.

Sources: [goal discovery](references/goal-discovery-experiments.md), [evidence hypotheses](references/evidence-hypotheses.md), [architecture review](references/architecture-review.md), [implementation comparison](references/implementation-approaches.md).

### Fixed targets, eligibility and arithmetic

Fixed-set execution preserved target identities while votes changed scores. Jev interpreted collection identity, membership, count and effects; code retained original identities and accounted for each action. Unconditional collection machinery regressed ordinary community navigation, so a goal-routed controller retained the general loop for other tasks. Routed v17 beat unconditional v13 on a selected two-task public comparison, 2/2 versus 1/2, but tied original v10 at 3/5 on five unopened practiced-template instances and regressed 28/39→27/39 on one MiniWoB comparison.

Pagination was particularly difficult. One 48-record authored fixture rendered only 24 records while claiming its fourth page was the end; that pair was invalidated with charges and traces retained. After reachability was repaired, two traversal variants acted on wrong authors. Specialized multi-page member traversal was disabled by default.

Eligibility before ranking yielded a narrower retained improvement. Initial variants completed all four authored positives but failed a wrong-collection negative. A focused collection-identity question plus item eligibility improved a fresh authored sample from 1/4→4/4 positives and 0/2→2/2 negatives, with calls rising 33→47. This was practice-family evidence without a new WebArena score. A separate action-local picker policy looked better locally but lost public transfer in three successive comparisons and was rejected.

Relative numeric binding followed a useful caller recovery: Jev bound the observed field, operand and relationship, and code computed exact decimal values with freshness and no-reapplication checks. A prequalified reserved authored cohort improved 1/4→4/4, preserving a fraction negative. Two public pairs tied 0/1 because failure occurred before arithmetic. Calendar calculations later improved authored intended assignments 2/10→10/10 from explicit caller dates, preserving four negatives. Ambiguous dates, unsupported business-day calendars and absent anchors remained unresolved; the wall clock was not a hidden source of task dates.

Sources: [execution contracts](references/execution-contract-experiments.md), [eligibility and picker policy](references/policy-boundary-experiments.md), [numeric transfer](references/public-transfer-study.md#relative-numeric-binding), [calendar and RC development](references/rc-improvement-study.md).

## 6. The caller still matters

Independent caller studies measured reasoning, composition, derived values, browser gestures, helper calls and model charges separately. A caller's final acceptance of already completed work differs from intervention that advances an unfinished goal.

| Matched study | Direct caller | Jev alone | Caller with Jev | Effort/cost finding |
| --- | --- | --- | --- | --- |
| Six completed authored positives | 6/6 goals; 5/6 with scope | 5/6 goals/scope; 4/6 complete reports | 6/6 goals/scope and complete reports | Caller decisions 50→22; gestures 28→4; model cost $0.129195→$0.128603 |
| First public caller matrix, five practiced-template cases | 5/5 saved goals; 4/5 with action scope | 2/5 goals/scope | 3/5 saved goals; 2/5 with action scope | Caller decisions 65→47; gestures 38→18; cost $0.608160→$0.904623 |
| Three-case public follow-up | 2/3 saved goals | 0/3 saved goals | 3/3 saved goals with reviewed action scope | All delegated goals needed recovery; decisions 54→51; gestures 37→31; cost $0.810555→$1.429907 |
| Reserved authored picker | 1/1 | 1/1 | 1/1 after natural takeover | $0.022602 direct, $0.001805 standalone, $0.038852 assisted |
| Two newly evaluated Admin templates | 0/2 | 0/2 | 0/2 | All four caller trials hit spend reservations; lower assisted cost reflected earlier stops |

The first authored caller matrix included an initial provider-rejected direct start; its completed six-trial row is not an all-starts denominator. Including that start, direct reached 6/7 started goals and 5/7 with correct scope. Public caller matrices likewise retain rejected references, partial reward, cost stops, corrected transient edits and unassessed scope.

Handoff evidence was one of the clearer efficiency improvements. Adding bounded historical readbacks alone initially left caller effort unchanged at eleven decisions and four gestures. With identical evidence-use guidance in both arms, a completed three-page case fell from nine to two caller decisions and four to zero gestures, at $0.044406→$0.021623. A fresh intentionally interrupted case fell from 23→9 decisions and 10→3 gestures while correctly finishing the remaining targets. Other cases received no extra history and their variation was not credited to the change. These were two exposed, guided authored comparisons; the helper's autonomous policy and original non-complete returns were preserved.

Large captures could overwhelm the bounded API caller. A half-megabyte product observation required a conservative next-call reservation near $3.05 against a $0.60 trial cap. Removing duplicate metadata still required about $2.01. An unpaid bounded sample reduced estimated reservation to $0.107–$0.124, but did not establish navigability, coverage or successful recovery. This was a transport feasibility finding, not a solved workflow.

Sources: [authored caller study](references/caller-workflow-study.md), [public caller matrices](references/webarena-caller-study.md), [handoff history](references/handoff-history-study.md), [release evaluation](references/release-evaluation.md).

## 7. Release-candidate progress and its limits

The renewed RC campaign made general changes to observation settling, large select captures, feedback preservation, exact numeric substrings, explicit-date arithmetic and destination-versus-collection review. It used the current Codex agent for assisted trials, with no GPT-5.4 API calls in that campaign. Its caller tokens and subscription cost were unmeasured.

The development sequence matters. A twelve-instance v5 matrix improved standalone full reward 1/12→4/12, while the assisted workflow reached 8/12 with extra time and 104 caller gestures. A later v6 nine-task comparison improved 2/9→3/9 but missed the material-gain gate and introduced a false completion and wrong-field effect. Subsequent calendar and review repairs recovered development cases, yet v15 lost two MiniWoB regressions, 8/8→6/8. Targeted changes culminated in a frozen v17 eight-family check at 6/8→7/8, with flight booking still unfinished in both arms.

The final v17 Shopping Admin comparison reserved nine unopened instances in four practiced families: six reports, two price edits and one product creation. Standalone arms had equal one-call, 45-action, 90-decision and 150-second budgets. The assisted workflow allowed two helper calls, eighty shared gestures and 600 seconds.

| Final v17 arm | Full rewards | Complete reports | Caller gestures | Helper invocations | OpenRouter cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| Retained original Jev | 0/9 | 0/9 | 0 | 9 | $0.062701800 |
| Candidate Jev | 3/9 | 3/9 | 0 | 9 | $0.189173208 |
| Current Codex with candidate | 6/9 | 6/9 | 24 | 12 | $0.214829202 |

Three standalone wins and no losses gave a 33.33-point improvement and exact paired two-sided p=0.25. This passed the study's predeclared 25-point material threshold after review; it did not establish statistical significance or broad browser reliability. The gain also used roughly three times the standalone comparator's model cost in this matrix.

The three standalone completion claims matched their goals independently. Price saves nevertheless wrote additional default fields and line-ending changes. Zero-model unchanged-save controls reproduced the collateral pattern, which remained disclosed. One assisted product-creation recovery added Size to a shared attribute set despite authorization only for the product, a confirmed scope violation before any later product save. Another apparently correct report lacked enough network evidence to resolve its official rejection and remained unassessed as a full independent goal.

Total RC campaign OpenRouter charges reconciled to $2.641157022, including development failures and interruptions. Its 470 passing offline tests established regression checks for that source, not 470 successful browser tasks. The retained candidate was accepted for the narrow measured material gain; no release publication followed.

Source: [complete RC history and final audit](references/rc-improvement-study.md#final-frozen-v17-comparison-and-audit).

## 8. The broad campaign did not reach confirmation

The October 1 broad protocol reserved sixteen primary development tasks across Shopping Admin, Reddit and GitLab, plus two exposed date diagnostics. Confirmation reserved 48 instances across 21 families on Shopping Admin and GitLab. Sixteen GitLab families were absent from development; the Admin families tested instance transfer. The confirmation set contained no reports.

Its acceptance gate was stricter than the preceding nine-task study: account for all 48 pairs, at least forty valid pairs across ten families and two sites, at least 60% candidate strict completion, at least twenty points of gain on the original 48-task denominator, positive gain on every site, both exact paired and family-cluster tests at p<0.025, and no new wrong effects or false completions. Infrastructure exclusions required independent no-effect and restoration evidence; actor interruption remained an actor failure.

The first six Admin development pairs, using candidate v1, improved strict completion 1/6→3/6 and exact scoped goals 2/6→3/6. One strict win concerned reporting an already achieved report, rather than adding a new exact goal. Two strict wins with no losses gave p=0.5 on this selected development set. It was not broad acceptance.

Further authored and component experiments tested navigation context, capture indexing, clickable section headers, affected-object scope wording, numeric ledgers, cross-view identity, date boundaries, query fallback, report qualification, completion evidence, multiselect factorization and contradiction guards. Several improved isolated judgments without improving whole tasks. Query fallback, factored multiselect and report-qualification wording were excluded. A ledger-aware completion review repaired a forced-resume report without repeating the first relative edit; this was a two-invocation authored gain, not a standalone public-task win. A contradiction guard preserved one demonstrated review boundary but a known wrong-date retry still bypassed it through an incorrect initial target judgment.

The combined development source passed 557 offline checks. Public Reddit development then exposed a material scope regression: text authorized for a later comment was copied into the review Body and persisted there, followed by the comment, with a false completion. The baseline also falsely completed while omitting the requested review body. Final global audits were still pending for other provisional outcomes; they cannot be promoted to strict successes.

GitLab initialization remained unqualified because imported merge-request state changed. No GitLab actor score was established. Reddit reset qualification covered thirty tables, more than 3.3 million rows and 31,467 upload files; these were environment checks, not actor completions.

**All 48 confirmation tasks remained untouched when the final pilots stopped. The broad protocol was never satisfied, and there is no final broad improvement claim.** The later explicit NO-GO reports supersede any older note saying a broad release decision was merely pending. Exact component figures and source changes remain in [the broad study](references/broad-rc-study.md).

## 9. Final bounded and architecture pilots: NO-GO

### Integrated standalone screen

The bounded screen froze one integrated candidate and six predeclared development pairs. Four complete pairs established:

| Outcome | Comparator | Integrated candidate |
| --- | ---: | ---: |
| Exact goals on completed pairs | 4/4 | 3/4 |
| Strict completion on completed pairs | 2/4 | 3/4 |
| Calls on completed pairs | 133 | 112 |
| Calls where both achieved exact goals | 88 | 87 |
| Helper latency across those common successful pairs | 70.19s | 71.57s |

The candidate's added strict completion reported an already achieved upvote; it lost an exact address goal. Lower total requests mainly reflected abandoned work. A fifth candidate attempt handed off incomplete, then its official evaluator raised “Alternatives require 2+ items”; read-only state recovery established no business change. Its comparator and both sixth-task arms remained unrun. The original six-pair denominator was preserved.

A missing-review negative withheld wrong Body fills and submission, whereas the comparator falsely completed an empty-body post/comment. That narrow boundary did not establish broad content ownership: Body was also mislabeled as not requested. Seven of forty legacy mock protocol checks remained failing under the extended answers/wording. The integrated candidate stayed private and was not adopted. Additional Jev charges were $0.156160704, exactly reconciled. The result was explicit NO-GO.

### External reference usability

A pilot pinned `awlevin/typesafe-computer-use` at `44ca11f0935b021b73020825da054b5c92cc1288`, retaining upstream DOM decisions/actions while adapting private transport. Only its predeclared development negative ran before the stop rule; all four positives remained unrun.

Jev chose generated-URL navigation twice. The text model first declined, then supplied public `reddit.com/r/books` despite the observed benchmark application being Postmill. Its composition packet omitted the current page URL. Navigation was followed by a null DOM scrolling-element failure. No review form was reached, so the missing-content negative did not pass. No business mutation occurred, but external-destination action scope failed. Two Jev and two writer calls cost $0.000982266, provider-reconciled. A zero-model CDP probe established working perception transport only. The result was NO-GO, without a paired effectiveness comparison.

### Hybrid owner and mechanical guard

The actual pattern pilot compared a hybrid owner with the comparator on one public discussion task. The comparator saved the exact title/body with clean scope. The hybrid navigated twice, then requested thirty characters from a supplied 29-character title and stopped before typing. Hybrid cost was $0.013516776 versus $0.007936782 for the successful comparator.

The mechanical guard passed nine local browser checks and reduced one isolated field path from six to three CLI calls, yet withheld the real Title fill as stale; its rejection cause remained unresolved. On the negative, the hybrid requested a goal span ending at 116 despite a 113-character goal. Neither tested negative exercised the required ownership repair, so neither received negative-pass credit.

Only one of four hybrid pairs completed; three hybrid pairs and all four mechanical pairs remained unrun. Four paid invocations used sixty Jev calls and four owner calls, totaling $0.027987756 with exact reconciliation. Neither architecture established useful completion improvement or a substantially more efficient development process. The result was NO-GO; no candidate was adopted and no next phase was launched.

Public summaries: [bounded screen](references/archive-trials/bounded-go-nogo.md), [reference usability](references/archive-trials/reference-usability.md), [pattern pilot](references/archive-trials/pattern-trials.md). These retain failed starts, missing pairs, costs and stop decisions while omitting private execution paths.

## 10. Accounting and research overhead

Helper price, caller price, complete-task time and engineering overhead answer different questions. We report them separately.

* Early Codex figures are token-based API-equivalent estimates. They are not subscription charges.
* Later Jev and independent caller trials retain provider-reported receipts and key-usage reconciliation. Unknown dispatch charges were conservatively reserved until resolved.
* Historical whole-key reserves intentionally overlap. A conservative figure such as $32.845740894 under an earlier $40 authorization is not a claim of that campaign's billed spend.
* Several displayed totals are cumulative checkpoints that include earlier campaigns. Adding them together would double-count. There is no reconstructed all-history invoice in this report.
* Current-Codex RC reasoning and subscription cost were unmeasured. Lower caller gesture counts do not imply zero caller effort or lower total cost.

Selected independently reconciled campaign amounts are $0.443878 for value binding, $0.716347 for goal discovery, $0.361893 for evidence hypotheses, $1.239962 for execution contracts, $0.977934 for handoff history, $0.184024 for policy boundaries, $0.083351026 for finalization, $0.820877556 for release evaluation and $2.641157022 for the renewed RC campaign. Each remains attached to its own evidence and scope. The final pilot's known Jev campaign checkpoint was $0.839555178; its separately metered owner charges are included in the pattern pilot total above. These are not additive global totals.

The final pilots also recorded engineering usage. The bounded screen took 93.6 measured engineering minutes and recorded 19,185,409 cumulative tokens, including 18,541,056 cached input and 644,353 uncached input plus output. The reference trial's available delta recorded 7,654,562 total tokens, including 7,390,720 cached and 263,842 uncached input plus output. The pattern pilot recorded 13,830,910 total, including 13,338,624 cached and 492,286 uncached input plus output over 47.84 elapsed minutes. Measurement boundaries differ, and these counters are neither unique generated-token counts nor dollar bills. Their overlap and exclusions prevent summing them into a reliable all-project engineering cost.

The credible economic question is successful complete-task work, including verification, recovery and development—not merely the price of an individual Jev decision. The experiments did not establish substantially lower engineering usage for a useful broadly reliable result.

## 11. Validity limits and reproducibility

This is one evolving implementation, not a controlled comparison of all possible Jev architectures. Most repairs were developed against inspected tasks. New instances of practiced families, new seeds, authored reserved variants and never-opened families are different forms of transfer. No claim is made about whether any model encountered these public tasks during training.

Small samples, reused baselines, provider variation, browser references, caches, concurrent early trials and changing observation timing limit causal inference. Candidate identifiers are campaign-local. Best rows from different snapshots cannot be combined into a fictional controller. A targeted replay may diagnose a repair but cannot replace an earlier failed primary attempt.

Official partial reward was sometimes dominated by response-contract credit, while wrong or incomplete mutations remained. An author task's 1/9 reward did not mean one of eight requested votes succeeded; none did. Some goals and evaluators disagreed about address targets, descriptions, date endpoints or expected records. These cases remain ambiguous, evaluator-unavailable or independently reviewed as specified; actor logic never received the hidden expected answer.

The archive includes public synthetic JSON evidence, source, fixtures, statistical acceptance code and detailed study narratives. The [evidence register](EVIDENCE.md) inventories every retained pre-archive campaign directory and identifies private-only records. Raw `.runs` bundles contain page captures, local paths, encrypted state and provider records and remain ignored. Public final-pilot summaries are curated from those bundles; source-summary hashes preserve their provenance. Public readers cannot independently replay every historical private trial from this repository alone. No unavailable `.runs` file is presented as a working public link.

Offline source checks can be inspected without installing a skill. Historical paid runners often expect the former `SKILL.md`, credentials, frozen comparators and benchmark images. The archive intentionally removes that entrypoint; those runners are retained as research source, not a maintained turnkey reproduction or installation interface. This archival request made no paid model calls and did not start benchmark services.

## 12. Conclusions and archival decision

Several findings are worth retaining:

1. **Delegation can save substantial orchestration time on a suitable authored workflow.** The twelve-action report result was large; shorter tasks and later caller studies did not show a consistent benefit.
2. **Observed mechanics deserve exact treatment.** Readonly state, native selected values, date-control dispatch, text copying, source freshness and resume ledgers supported concrete repairs.
3. **Correct arithmetic depends on correct semantic binding.** Sorting or decimal calculations did not prove collection identity, field ownership or complete membership.
4. **Repeated same-model judgments do not provide independent verification.** They sometimes contradicted correct bindings, agreed on wrong targets or reported unfinished work complete.
5. **A typed query is not a committed selection, and a successful command is not a saved outcome.** These distinctions recur across picker, report and mutation failures.
6. **Caller work must remain visible.** Reasoning-only recovery, supplied prose, derived values, acceptance and direct takeover have different costs and outcomes.
7. **Evidence handling can reduce recovery overhead without improving autonomy.** Guided historical handoffs produced a narrow measured benefit.
8. **Benchmark integrity is part of the result.** Reset qualification, rendered reachability, scope projections, failed starts and untouched confirmation sets materially changed what could be claimed.

Future research could test a smaller mechanical executor, explicit ownership contracts, current-site navigation grounding, navigation-aware DOM readiness or consistent fact authority across review stages. The final pilots do not disprove all such designs; they also do not validate them. These are open questions, not an automatic continuation plan.

**We archive Agent Browser Jev as a research artifact and discontinue skill installation.** The current repository tree removes `SKILL.md` rather than hiding it through metadata. The standard CLI is `npx skills`; its [discovery implementation](https://github.com/vercel-labs/skills/blob/main/src/skills.ts) checks for that filename, and its [official documentation](https://github.com/vercel-labs/skills#skill-discovery) describes recursive discovery. Preserved instructions have an archive banner before their historical frontmatter.

This change prevents discovery of Jev from the updated repository tree, including full-depth discovery. It cannot revoke existing copies or make past Git commits, release tags and forks disappear. Remote installation behavior changes only after the archive change is published to the repository's default branch. Other skills in this multi-skill repository remain available. The source and research evidence remain accessible for inspection under the MIT license.
