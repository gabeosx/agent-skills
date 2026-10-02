> **Historical research evidence.** Agent Browser Jev was archived on October 2, 2026. Results and decisions below belong to their original snapshots; the [final research report](../RESEARCH.md) records the later NO-GO decisions. Installation and automatic campaigns are discontinued.

# Architecture feedback assessed against the experiments

Reviewed September 29, 2026 against the current pending 1.3.0 source and the preceding day of preserved experiments. This is an engineering assessment, not a new benchmark score. The external reviewer saw the code, but not the full experiment history. Its architectural concerns are useful; its proposed priority order is not supported wholesale.

The September 30 [implementation comparison](implementation-approaches.md) adds the subsequent picker/display and real-caller evidence. It recommends testing specialist authority and eligibility-before-ranking separately, preserving the failed reviewer simplification and all earlier source-specific results. The later [policy-boundary experiments](policy-boundary-experiments.md) score those proposals separately: the picker rewrite is rejected after public regressions; focused collection identity and eligibility-before-ranking are retained on narrow authored and regression evidence.

## Findings and disposition

| Feedback | Assessment with hindsight | Disposition |
| --- | --- | --- |
| Leave `goal-facts` as a bounded interpretation/arithmetic layer | Agree. It is not the only representation of the raw goal. Source/context, action and completion judgments still see the intent. Exact arithmetic remains conditional on semantic binding. | Keep it; test a targeted ablation if traces identify a concrete conflict. Do not replace it with a general goal language. |
| Initial absence of a collection permanently loses batch execution | Incorrect for this path. `executionRoutingRequest()` returns null, and `decideWithContract()` leaves `controllerMode` null. It revisits routing on the next observation. A new regression executes that exact transition and confirms later batch activation in the same step. | No runtime repair for this claimed bug. |
| The structural gate recognizes too few collection shapes | Valid limitation: the gate recognizes search-plus-links or headed article/row structures. A checkbox group or unheaded list may never trigger it. This is separate from initial-page stickiness. | Test additional observed collection structures with positive and wrong-collection cases before broadening the gate. Missing routing is not automatically a missing browser capability: the general controller remains available. |
| A decided general mode is sticky | Correct for the same step. `unknown` is also collapsed into general. Routing reads the original goal/context, not page content, so simply retrying the same classification on each page can add nondeterminism and cost. Batch-to-general fallback also intentionally disables unsupported multi-page member traversal after wrong-author effects. | Separate “decided general,” “unknown,” and “unsupported binding” in a future experiment. Do not reactivate rejected traversal whenever the page changes. Require an identified boundary or new evidence and a bounded reconsideration count. |
| Broader batch execution should be the first change | Not established. Unconditional execution regressed a public community-selection task; routed v17 recovered it. Later multi-page author variants made wrong-author effects. | Preserve narrow routing until a specific missed-activation case demonstrates a benefit without those regressions. |
| Action review is acting like a second planner | Substantially fair. It sees a large overlapping task/evidence projection, and `suggestedNext` adds alternative selection. However, the suggested alternative is advisory and must go through new selection; it is not directly dispatched. | First isolate removal of alternative suggestions or narrower review questions. Preserve exact target, edit mode, effect timing and already-satisfied-state checks. |
| Same-model review is not independent assurance | Agree, and the measured failures confirm it: reviews can block a correctly bound target or agree on an incorrect one. | Continue independent application-state and full action-scope verification. More calls alone are not a safety claim. |
| Formalize semantic ownership | Agree as a maintainability and experiment-design improvement. It will not itself make an incorrect binding correct. | Document what each output may influence, when it expires, and which conflicts block dispatch. Avoid another model layer or a new universal intermediate language. |
| `navigationCoverage` sounds broader than the collected routes | Correct. It currently tracks tabs, submenu hovers and tree expansion, and existing usage docs explicitly say so. Recent action/state facts cover more than that named frontier. | Clarify the public field's narrow scope. A navigation classification can annotate an attempted transition; it cannot prove all relevant routes have been enumerated. Avoid treating it as search completeness. |
| Require `--allow-all` for ordinary CLI use | Disagree as a priority and as an implied vulnerability diagnosis. The CLI deliberately accepts a user-authorized bounded goal and permits supported gesture types within that task; optional allowlists further restrict it. The embedded `act()` API defaults to no gestures until its host supplies authorization. These are different layers. | Preserve the documented delegation contract. Deny-by-default CLI behavior would be a breaking workflow change, not an accuracy improvement. Explicit policy metadata or an optional strict mode could be evaluated separately. |
| Share invariant prompt fragments | Reasonable maintenance work if semantic distinctions remain local. Repetition is partly necessary because independent calls do not share instructions. The before-effect/at-effect/final-screen distinctions must not be flattened. | Extract only truly identical invariants, preserving serialized requests initially. Test behavior and authority boundaries, not merely presence of a magic sentence. |
| Add a general UI classifier | Agree with the review's revised recommendation to defer it. Recent failures include mechanically incorrect affordances, for which another semantic call is the wrong first remedy. | Recover observed control facts and enforce dispatch constraints before asking Jev to reason harder. |

## What has already been ablated

These are different small samples and snapshots. Their numerators must not be combined.

- **Removed semantic reviews:** on seven authored discovery positives, reviewed v10 reached 7/7 with zero wrong effects; the no-review variant reached 6/7 with one wrong subscription and a false completion, using 32 versus 74 calls including the negative. This argues against wholesale removal. It does **not** isolate action-check alone. [Goal-discovery evidence](goal-discovery-experiments.md)
- **Reduced review evidence:** full action-review evidence passed 9/10 labeled decision probes versus 4/10 for a smaller target/peer/control projection. This rejects that projection, not every shorter prompt. [Goal-discovery evidence](goal-discovery-experiments.md)
- **Flat versus factored selection:** seven public instances produced 2/7 full goals for flat versus 1/7 for factored, with one wrong-effect case and two contradicted completions each. A local semantics-preserving factored variant cost about 65% more without improving local completion. That design was rejected. [Capability record](capability-status.md#isolated-selector-design-comparison)
- **Shared semantic stage/target state:** local conflicts were repaired, but public development remained 3/7 goals in both arms and unopened practiced-template instances remained 2/7. Calls increased. Formalizing ownership is useful; adding another planning state is not a demonstrated solution. [Goal-discovery evidence](goal-discovery-experiments.md)
- **More history and advisory target bindings:** several variants lost aggregate authored goals. One correct fixed target set still conflicted with later review after scores changed. This supported a controller with explicit membership lifetime, rather than more advisory prose. [Target-set evidence](evidence-hypotheses.md)
- **Unconditional versus routed execution:** routed v17 passed both named public diagnostic cases versus one for unconditional v13. Five other unopened instances tied v10 at 3/5. Broad MiniWoB coverage was 27/39 versus 28/39, retaining an autonomy regression. [Execution-controller evidence](execution-contract-experiments.md)
- **Earlier handoff evidence:** extra text alone did not reduce verification in the first trial. With shared evidence-use guidance, two exposed authored comparisons reduced caller work while preserving the achieved/incomplete distinction. This is a narrow result, not evidence that every larger handoff helps. [Handoff evidence](handoff-history-study.md)

Action-check-only, goal-facts-only and source-context-only removals have not been established by those combined ablations. Nor has an unknown-only bounded rerouting policy been compared with current routing. They remain new hypotheses, not missing repetitions of already decisive evidence.

## New tests of this feedback

The review prompted two narrow action-review variants, frozen before the comparisons. Both retain the full evidence projection. One removes only the alternative-action suggestion; the other also shortens the immediate-action instructions. Neither changes the selector, goal facts, routing, model or caller goal. Neither has been promoted into the skill.

| Completed comparison | Current review | Remove suggestion only | Shorter review |
| --- | ---: | ---: | ---: |
| Correct allow/withhold decisions on ten practiced, labeled snapshots | 9/10 | 7/10 | 9/10 |
| Invalid effects permitted, among four negative snapshots within those ten | 0/4 | 0/4 | 0/4 |
| Authored browser goals with correct scope and complete reports | 13/13 | Not advanced | 13/13 |
| Separate authored negative checks | 3/3 | Not advanced | 3/3 |
| MiniWoB full reward, five practiced families at fresh seed 6217 | 5/5 | Not advanced | 4/5 |
| MiniWoB full reward plus complete report, same five cases | 5/5 | Not advanced | 4/5 |

The shorter review reduced cost on the local scope/edit checks, but provided no additional verified goals. On MiniWoB autocomplete, both selectors proposed filling the legitimate caller prefix `Isra` for “starts with Isra and ends with el.” Current review allowed discovery, then selected `Israel` and submitted correctly. Short review classified the exact prefix as an unsupported value and returned control without a gesture. This is an autonomy regression, not a wrong effect or a false-completion regression. A caller may recover it, but no caller participated in this comparison.

The first MiniWoB invocation accidentally selected the adapter's default five cases rather than the intended 39. A separately recorded continuation selected only the remaining 34. That continuation then reached the container process limit after accumulating orphaned browser zombies; ordinary episode results were held in Python memory and were lost when the stalled container was stopped. Its report is **incomplete and unscored**. Navigation logs are not completed-attempt or reward evidence. There is no 39-family result for these variants, and the failed continuation has not been rerun to rescue them.

The candidate therefore remains rejected for promotion: the completed transfer sample contains a new failure and no gain. This does not prove every narrower reviewer will fail. It shows why architectural simplicity needs a behavioral comparison, and why a shorter prompt can remove useful distinctions between discovery input and final effect values.

Private evidence is under `.runs/action-review-ablation-20260929/`: the three probe definitions in hash-recorded `run.mjs`; frozen browser snapshots `current` and `short_review`; `plan.json`, `report.json`, `probe-label-audit.json`, `scope-current.json`, `scope-short.json`, `text-edit.json`, `miniwob-transfer.json`, `transfer-continuation.json`, and `miniwob-transfer-remaining.json`. The latter remains incomplete. `transfer-interruption.json` and `usage-after-interruption.json` preserve the infrastructure failure and aggregate provider charges. Earlier traces were checked to ensure snapshot labels did not confuse requested membership with an already-satisfied effect.

The harness repair passed a separate no-model lifecycle test: 48 repetitions of one known control left zero browser zombies and no process-limit events. An intentional hard exit preserved 48 evaluated episode records and an unevaluated synthetic helper completion, which recovery correctly kept unverified. These repetitions are infrastructure validation, not 48 new benchmark goals. The changed WebArena harness separately passed restoration in both arm orders and official positive/negative evaluator controls, then returned to clean state before scoped cleanup. The offline suite passed 382 tests; skill structures, 100 local documentation links and the release contract also passed.

## Semantic ownership to preserve

| Component | Allowed influence | Limit |
| --- | --- | --- |
| Caller goal, scope and operation policy | Define the authorized task and permitted gestures | Page content and model classifications cannot add authority |
| Goal binding and source-context interpretation | Bind literals, target predicates, explicit page conditions and timing | Fallible interpretation; numeric truth does not establish the semantic target |
| Selector | Propose the next currently observed operation | A proposal is not dispatch approval or completion proof |
| Action review | Assess immediate target, value, prerequisites and duplicate effects | Suggestions are advice; reviews do not redefine the goal or establish independent truth |
| Condition reconciliation | Resolve conflicting explicit condition assessments | Contradiction is not silently promoted to a satisfied prerequisite |
| Execution contract | Retain model-bound membership, identity and effect progress | Capture coverage differs from site coverage; unsupported traversal remains unsupported |
| Completion review | Assess whether the complete requested outcome is supported | Model-reported completion remains subject to caller or external verification |
| Deterministic code | Enforce allowed controls, exact bytes, arithmetic, freshness, budgets and dispatch | Mechanical guarantees hold only for the correctly bound observed objects; they cannot prove their meaning |

Explicit responsibility should not make an early classifier the unquestionable authority on meaning. Later evidence must be able to challenge an incorrect target or condition binding. The useful contract is who may propose, retain, invalidate or dispatch a decision—not a prohibition on noticing a contradiction in another classifier's answer. Otherwise a cleaner pipeline could preserve the first semantic error more efficiently.

## Revised experimental priority

Fix demonstrated observation/dispatch errors and caller measurement defects first. They can be reproduced without model interpretation and confound architectural comparisons. Then isolate a single semantic responsibility on captured failures with balanced counterexamples, followed by browser execution and a separate transfer set. The initial narrower-review experiment above has now failed its transfer check; further work needs a new trace-supported hypothesis. Unknown-only routing reconsideration remains more justified than enabling batch execution everywhere, but has not earned promotion either.

The latest WebArena matrix also makes delegation economics central: four fresh instances of practiced templates plus one practiced author diagnostic gave full saved goals to the direct caller on 5/5, Jev on 2/5, and caller-with-Jev on 3/5, with partial author work in the latter. Two caller runs repaired transient wrong edits, which remain action-scope failures. A conservative caller cost estimate also stopped two delegated runs early; follow-ups are reported separately. These results strengthen the case for measuring useful work and takeover overhead, not for maximizing the number of Jev classifiers.

## Follow-up: bind decisions to their evidence

The [picker commitment study](picker-commit-study.md) tested the responsibility/coordination concern directly. Extra evidence and broad vetoes were insufficient. Field-specific requirement and readback binding, shared with action review and followed by an observed-option choice, recovered narrow authored goals while retaining ordinary permissions. Its query-driven regression required executed history and bounded remaining preparation choices. This supports more explicit data flow between semantic decisions; it does not support deleting action review, requiring caller plans or treating earlier model judgments as authoritative.
