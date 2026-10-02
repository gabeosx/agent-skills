> **Historical research evidence.** Agent Browser Jev was archived on October 2, 2026. Results and decisions below belong to their original snapshots; the [final research report](../RESEARCH.md) records the later NO-GO decisions. Installation and automatic campaigns are discontinued.

# Implementation approaches and the recommended direction

Reviewed September 30, 2026 for pending Agent Browser Jev **1.3.0**. This is a comparison of preserved experiments and current source, not a new scored campaign or a runtime promotion. At the initial comparison checkpoint, the working runtime was the retained readonly-display candidate, validated by 411 offline tests and 27 positive components plus one separate negative. The subsequent [policy-boundary experiments](policy-boundary-experiments.md) reject the tested picker rewrite and retain a narrow ranked eligibility/collection-identity fix with 418 offline tests and scoped browser regression.

**Use the flat, grounded Jev action selector as the general foundation. Keep exact browser evidence and deterministic execution checks. Give specialists narrow responsibilities rather than control over the whole task. The next semantic capability to test is eligibility before ranking, with explicit retention and invalidation of target bindings.**

There is no demonstrated overall winning historical build. The recommendation concerns architecture and experimental priority. It does not declare v10, v17 or the current picker build globally superior, and does not authorize restoring task-specific sentence rules.

## What the comparisons establish

Each row compares arms from its own cohort. Rows cannot be pooled into a leaderboard: families, seeds, source snapshots and scope audits differ. Unless labeled assisted, these arms had no caller intervention. Expected negative cases are outside positive success denominators.

| Approach | Comparable evidence | Disposition |
| --- | --- | --- |
| Earlier task-specific semantic heuristics around Jev selection | The initial general refactor fell from 41/42 to 33/42 MiniWoB rewards, with eight paired losses, no wins and four candidate false completions. Later general repairs recovered 42/42 on the 21 practiced families; the six-family interpreter holdout was only 1/6 in both arms. | Learn the missing mechanics: expose controls, distinguish query from selection, preserve multi-stage progress and verify final state. Do not restore task-sentence recognizers. The recorded 1.2.1 baseline did call Jev; its rigidity lived in code policy around those calls. |
| Bounded goal interpretation plus code arithmetic (`goal-facts`) | Final interpreter: 42/42 versus 42/42 rewards, with 40 versus 38 complete reports, on practiced MiniWoB families. Isolated WebArena: 4/8 versus 5/8 full rewards and 5/8 versus 6/8 scoped goals. This was a package comparison, not a goal-facts-only ablation. | Keep its bounded role. It is neither a sufficient general goal representation nor an established cause of the latest regression. Broader judgments still receive the original goal. |
| Flat selection plus exact value/source binding (v10) | Versus conditional binding v8: 29/39 versus 28/39 MiniWoB rewards at seed 5093; 28 versus 27 also reported complete. Local value tasks tied 6/7 positives and 3/3 negatives, with calls 78 → 64. Broad calls were 313 → 314. | Preferred general foundation. Preserve code-owned copying, freshness and readback. The efficiency gain was local; broad scope was audited on only four families. |
| Factored operation/target selection | Shortened variant lost local goals and falsely completed three. Full-description variant tied 6/7 but cost about 65% more. Isolated WebArena flat/factored: 2/7 versus 1/7 full reward and scoped goals; two contradicted completions each. | Reject the tested default. This does not reject batching independent questions or separating eligibility from arithmetic. |
| Task stages, larger history, reduced context or advisory target sets | Shared task state tied 3/7 development and 2/7 new-instance WebArena goals, while calls rose 139 → 208 and 194 → 233. On five unambiguous authored tasks, expanded history, structured goals and advisory sets each reached 3/5 versus 4/5 baseline. | Do not add as a general planning layer. A correct advisory target set was later overruled by action review; more evidence alone did not settle responsibility. |
| Fixed target execution with goal routing (v17) | Routing beat unconditional execution 2/2 versus 1/2. Against original v10, five new WebArena instances tied 3/5; MiniWoB seed 6112 was 27/39 versus 28/39 rewards and 26 versus 27 reward-plus-complete. Multi-page member variants made wrong-author effects. | Retain fixed identity/effect bookkeeping for supported batches. Do not broaden routing or re-enable rejected automatic traversal on this evidence. General selection remains the fallback. |
| Picker requirement/state/identity classifiers | Authored picker goals rose 3/4 → 4/4 with about 17% more cost. A three-family detached-list sample rose 2/3 → 3/3 rewards, but complete reports stayed 2/3 and calls rose 40 → 59. The later public task 623 regressed from completion to handoff. | Keep useful picker evidence and selection distinctions. Test limiting picker authority to the proposed operation and relevant commit, rather than preempting all work. Local gains do not establish a public benefit. |
| Fewer or shorter semantic reviews | Removing reviews lost an authored goal, made a wrong subscription and falsely completed it. The shorter reviewer tied 13/13 local goals, then lost one MiniWoB autocomplete goal: 5/5 current versus 4/5 shorter. | Do not remove or compress all reviews together. Isolate responsibilities and activation first. Review calls are fallible assessments, not independent assurance. |
| Stronger caller planning or takeover | Planner advice recovered 1/3 scoped goals versus 0/3 restarts, but full reward stayed 0/3 and another case made a wrong ranked effect. Latest direct/Jev/assisted caller trial: 2/3, 0/3 and 3/3 saved goals; every delegated case needed recovery. Direct/assisted cost was $0.810555/$1.429907. | Keep takeover as an explicit fallback. It currently provides useful outcomes at an autonomy and cost penalty. The caller supplies an original goal, not a complete browser plan. |
| Earlier action readbacks in handoffs | With identical evidence-use guidance, two exposed authored comparisons reduced caller decisions 9 → 2 and 23 → 9, preserving goal and scope; the first required no additional browser gesture. | Retain. It adds no Jev decision calls. This is limited evidence of better assisted recovery, not an autonomous success gain. |

Sources: [historical controller and interpreter evaluations](study-gym.md), [value binding and Jev patterns](published-evidence.md), [goal discovery](goal-discovery-experiments.md), [target-set hypotheses](evidence-hypotheses.md), [execution contracts](execution-contract-experiments.md), [picker study](picker-commit-study.md), [review ablations](architecture-review.md), [caller study](webarena-caller-study.md), and [handoff evidence](handoff-history-study.md). The [capability status](capability-status.md) retains snapshot-specific reporting and scope limits.

## The recent regression is concrete, but not a universal causal verdict

WebArena task 623 used the same original goal, empty supplied values and no extra context. Both trials started from independently verified pristine persisted state and the same pinned backend image/reference.

| Recorded standalone trial | Outcome | Jev calls | Browser gestures | Cost |
| --- | --- | ---: | ---: | ---: |
| September 29, 5:10 PM ET; source frozen 4:40 PM | Full reward, saved scoped goal, reported complete | 23 | 6 | $0.008815 |
| September 30, 7:47 AM ET; source frozen September 29, 11:36 PM | Reward 0, unfinished handoff | 24 | 6 | $0.009062 |

Both navigated to `relationship_advice` and filled the title. The earlier run then filled the body and submitted. The later run opened and reselected the already-selected forum, then handed off with the body empty. Its assisted arm required two caller gestures to finish; the earlier assisted arm required none.

Five runtime files differed: the picker module was added and the adapter, control exposure, action review and review evidence changed. `goal-facts`, execution routing and the fixed-target contract were unchanged. Harness fingerprints differed and model variation remains possible, so this is a source-bound observed regression, not proof that every picker change causes failure.

The selected custom control had an empty native value despite displaying the forum name. The subsequent readonly-display repair now exposes exact display text separately. On new authored tasks it reduced one picker from 15 to 8 calls and improved two reserved workflow goals from 0/2 to 1/2. It has not been scored on public task 623; that task's paid attempts are exhausted.

## Two source-level problems deserve priority

**A local uncertainty can become a global stop.** In `agent-browser-jev.mjs`, picker assessment runs before ordinary action selection. A pending picker can force opening or selecting it; uncertain meaning, absent qualifying options or unresolved readback can return a whole-task handoff. This can prevent useful unrelated work, such as filling the body. Better display evidence repairs one trigger; it does not remove this authority problem.

The proposed boundary is narrower: the general selector may propose inspection, query preparation, an option selection or another form action. Picker assessment evaluates the operation that needs it. Unresolved selection still blocks a dependent Save/Submit, but should not automatically block unrelated permitted progress. This policy is **proposed, not validated**; preparation-only goals, unavailable options, preselected controls and wrong-option effects must remain protected.

**Ranking lacks a separate eligibility step.** The ranked branch of `execution-contract.mjs` binds each object's numeric metric and sorts the entries. Per-item semantic membership is asked in the separate all-members branch, not before ranked sorting. A collection-wide identity/coverage judgment therefore bears too much responsibility when the visible collection contains mixed topics or owners. Correct arithmetic can select the lowest-scoring object from the wrong semantic set.

This is a source-level gap in the specialized contract, not proof that this branch caused the latest general-controller edit failure. Both paths need to preserve the relationship between eligibility, ranking and the eventual effect.

Test focused per-item eligibility and metric binding independently, then let code filter, sort, count and detect boundary ties. Keep unknown eligibility and incomplete coverage explicit. A bound target remains a model assessment; code can preserve its identity but cannot certify its meaning. The latest membership-review variant prevented a wrong-topic edit but did not complete the goal, which shows that another veto alone is insufficient.

## Recommended implementation boundary

| Responsibility | Owner and scope |
| --- | --- |
| Explore an unfamiliar page and propose the next action | One general flat Jev selector, using the original goal, current controls and bounded observed progress. Discovery is helper work. |
| Relate caller meaning to objects, fields, sources or options | Focused Jev judgments for the relation actually needed. Retain evidence, uncertainty and a defined invalidation condition. |
| Copy text, preserve identities, compute rankings and dispatch | Deterministic code, conditional on the semantic bindings and authorized scope; exact freshness/readback checks remain. |
| Decide whether a proposed effect is permitted | Focused immediate-action review of the target, value, timing and existing constraints. An alternative suggestion is advice, not a new binding or authority. |
| Operate a coherent fixed batch | The bounded contract, only after scope, eligibility, metric and target lifetime are established. Unsupported traversal stays with general control or returns a truthful handoff. |
| Report completion or return useful control | Separate full-goal assessment and observed readbacks. Preserve incomplete work and count real caller assistance. |

Resolved bindings must have one responsible owner. Downstream review may invalidate them using specific conflicting evidence; it should not silently recompute a different target set after requested effects change scores. Contradictions remain unresolved until addressed. No additional universal semantic language or blanket approval of earlier model answers is proposed.

The official [primitive guide](https://docs.typesafe.ai/primitives) distinguishes bounded selection from binary and graded judgments, and explains that questions in one request are independent. The [model limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13) favor code for precise arithmetic and focused judgments over compound reasoning. [Fan-out](https://docs.typesafe.ai/patterns/fan-out) can batch independent eligibility/metric questions when their inputs are already available. The implementation boundary above is our inference from those patterns and our experiments; the documentation does not establish browser-task performance.

## Next comparison and acceptance rule

Do not run another broad bundled refactor. First freeze three source variants on the same new cases: **A**, the September 29 pre-picker control policy with current mechanical observation repairs; **B**, the retained current build; **C**, B with only the proposed action-local picker boundary. A is a rollback comparator, not a promoted release. This separates recovery of earlier behavior from the causal test of the new boundary.

Predeclare cases for a preselected picker with other unfinished fields, an empty picker requiring discovery, detached suggestions, already-satisfied state, an unavailable target and a preparation-only goal. Change labels, layout and wording. Add a small predeclared practiced-family public regression sample where attempt limits allow. Each case receives at most three helper invocations across those arms; exhausted public cases remain replay/audit evidence only. Qualify reachability and restoration without a model before scoring.

Then test eligibility-before-ranking separately on mixed topic/author collections, display-order decoys, detail-page edits, changed scores, ties and missing coverage. Do not combine it with picker-policy or reviewer-prompt changes. The earlier decision probes were promising, but browser transfer failed when later review contradicted correctly bound identities; this experiment must test the complete binding lifetime, not only classifier labels.

Promote only after paired independently verified goal **and action scope** improve, previously successful controls are retained, reporting does not hide unfinished work, and any added calls/cost are justified. Record official reward, completion claims and caller recovery separately. A safer unfinished return is valuable boundary behavior but does not count as autonomous completion. Existing negative results and unassessed scopes remain visible. Preserve the remaining authorized budget rather than using repeated runs to select a favorable outcome.

No paid calls or runtime edits were made for this comparison. A private review record under `.runs/implementation-review-20260930/` binds the key reports, frozen sources, current source and recomputed recorded aggregates. Documentation validation is recorded separately; the preceding 411 tests are not a new score or evidence of the proposed design.

## Subsequent experimental disposition

The comparisons proposed above were executed. Action-local picker variants repaired local cases but regressed public MiniWoB outcomes and remain rejected. Eligibility filtering improved authored positives but two scope-check variants failed the wrong-collection negative. A focused identity question plus eligibility passed the final paired authored cohort, existing batch regressions and components, and is retained. See the [experiment report](policy-boundary-experiments.md) for source-specific outcomes, additional calls and limits. The initial comparison itself remains an unpaid evidence review; this follow-up used the inherited paid allowance.

## Shopping Admin transfer follow-up

The [Shopping Admin study](public-transfer-study.md) keeps the Jev-driven architecture. Six new public development templates tie1/6; the ranked route does not activate. A mechanical waiting variant improves one practiced task but fails the reserved reporting gate (0/2 goals and one false completion), and its successful product save has an extra persisted price change. Navigation-classifier probes are rejected. No semantic heuristic rollback or experimental runtime promotion follows. A separate original-goal caller comparison reaches full reward0/2 standalone,1/2 direct and1/2 assisted. The caller recovers459 by deriving one exact price and resuming, without an end-to-end plan; Jev performs3 gestures. Its reasoning counts as assistance. Product-save scope stays unassessed and543 caller lanes stop under spend reservations. These fresh practiced instances establish a useful handoff, not a broad transfer advantage.

The subsequent numeric-value change follows this boundary: focused Jev selection of a destination, operand and relation; exact arithmetic and source/resume checks in code. Four prequalified authored transfer positives improve1/4→4/4 and the fraction negative stays safe; two public pairs remain unfinished before the new path. The numeric capability is retained without a task recognizer or public performance claim. Initial-page settling is a separate rejected transfer experiment: new price-task full reward improves0/1→1/1, but a reserved description task has a wrong-field fill and premature Save clearing price42→NULL, with8→28 requests. It is not bundled into the retained arithmetic change.
