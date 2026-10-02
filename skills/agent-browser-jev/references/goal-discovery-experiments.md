> **Historical research evidence.** Agent Browser Jev was archived on October 2, 2026. Results and decisions below belong to their original snapshots; the [final research report](../RESEARCH.md) records the later NO-GO decisions. Installation and automatic campaigns are discontinued.

# Goal discovery and planning experiments

Reviewed September 29, 2026. **Historical decision: retain v10 at this checkpoint.** The subsequent [execution-contract campaign](execution-contract-experiments.md) promoted a narrower goal-routed controller; the results below remain attributed to these earlier snapshots. These experiments did not establish a better default controller. The caller supplied the original natural-language goal in every arm, including ranking and author-based tasks; no end-to-end caller plan or hidden benchmark answer was supplied.

The follow-up [evidence and target-set experiments](evidence-hypotheses.md) tested explicit history, inspection memory, independent membership judgments, model-bound arithmetic and advisory target identities. No variant established a browser-completion improvement. A correct initial target binding could still conflict with later action review; resolving that contract remains open.

## Jev-only comparisons

Seven self-authored discovery goals covered a top-forum request, paraphrased/reordered pages, author posts across pages, filtered ranking, exact forum creation and already-satisfied state. An eighth, missing-input case was a separate negative. Server state and action traces verified goals and wrong effects independently of completion claims.

| Frozen controller | Correct positive goals | Wrong effects | Jev calls, including negative |
| --- | ---: | ---: | ---: |
| Then-current v10 | 7/7 | 0 | 74 |
| Reduced selection context | 6/7 | 0 | 73 |
| Reduced context + Jev stage/target memory | 5/7 | 0 | 94 |
| Full context + Jev stage/target memory | 6/7 | 0 | 103 |
| Full context + stage/target shared with action review | 7/7 | 0 | 104 |
| Removed semantic reviews | 6/7 | 1 | 32 |

Every variant stopped on the negative case. Removing reviews was cheaper but subscribed to a featured forum without establishing the requested ranking and falsely completed. Context reduction also lost a slider-value offline regression. Sharing task state repaired a local conflict where the reviewer rejected the exact correct action it suggested, but did not improve on the original controller's local completion count. These are development fixtures, not external generalization evidence.

The shared-state variant then faced frozen, restoration-qualified WebArena comparisons:

| Measure | Then-current v10 | Shared task state |
| --- | ---: | ---: |
| Practiced development instances: full official reward | 3/7 | 3/7 |
| Development: independently verified goal and scope | 3/7 | 3/7 |
| Development: completion reports / unfinished returns | 5 / 2 | 4 / 3 |
| Development: contradicted completion reports | 1 | 0 |
| Development: Jev calls | 139 | 208 |
| Unopened instances: full official reward | 2/7 | 2/7 |
| Unopened instances: verified goal and scope | 2/7 | 2/7 |
| Unopened instances: completion reports / unfinished returns | 3 / 4 | 3 / 4 |
| Unopened instances: Jev calls | 194 | 233 |

Both arms had zero caller interventions and no observed scope violation in these two comparisons. Each seven-task sample contained one semantically ambiguous “most appropriate forum” outcome with reward 0.5 and unassessed full goal/scope; it is neither a verified success nor a proven false completion. The unopened set used seven practiced templates, not unseen task families. Calibration 399 passed in both arms and is excluded from its denominator.

An earlier full-state planning comparison reached 3/7 official rewards versus 2/7. The unchanged baseline subsequently reached 3/7, so that apparent gain was not stable evidence of benefit. Its forum-description readback was incomplete at the time; the later audit enrichment does not retroactively verify that field.

A separate ten-case classifier diagnostic compared full action-review evidence with a smaller target/peer/control projection. It accepted valid targets and withheld invalid ones on **9/10 versus 4/10** cases. Expected labels were declared before calls. This rejected that projection; it did not measure browser-task completion or prove that all compact representations fail.

## Independent planner recovery

A separate frozen experiment compared up to two unchanged-goal Jev restarts against the same controller with up to two `openai/gpt-5.4-mini` planning interventions. Both shared one total budget of 45 browser actions, 90 Jev decisions and 150 seconds per task. The planner saw only the original goal, legitimate supplied values, returned observations and action/handoff evidence. It had no browser tools or benchmark answers. These were final development retries on three previously failed instances, not a holdout.

| Measure | Unassisted restart | Planner-assisted Jev |
| --- | ---: | ---: |
| Full official reward | 0/3 | 0/3 |
| Independently verified full goal and scope | 0/3 | 1/3 assisted |
| Wrong-effect tasks | 0/3 | 1/3 |
| Contradicted completion reports | 1/3 | 0/3 |
| Final non-complete returns | 2/3 | 3/3 |
| Jev calls / measured cost | 187 / $0.078090 | 253 / $0.109823 |
| Planner calls / measured cost | 0 / $0 | 5 / $0.034554 |

All six initial Jev invocations returned `handoff`. Planner work consumed 38,344 input tokens, 1,288 output tokens and about 22.8 seconds across the five calls. Its usage is additional assistance, even though Jev executed every browser gesture.

The successful assisted case discovered UpliftingNews and downvoted the sole matching AdamCannon submission. Independent database readback established the full goal and correct scope. Jev returned `decision_budget`; official reward remained 0.5, with the exact evaluator rejection cause unconfirmed. Accepting this verified result needs no further browser gesture, but the recovery remains assisted.

On the ranking task, assistance produced three of four required downvotes plus an incorrect fifth-ranked downvote, leaving the third target untouched. The planner explicitly misidentified the fifth item as fourth. Reward increased from 0.2 to 0.6, while scope worsened and the goal remained unfinished. The remaining author task was unfinished in both arms; the unassisted restart falsely completed after empty searches despite an independently confirmed matching post.

## Decision and evidence limits

Neither generic task stages nor free-form planner advice is ready to replace the current default. The useful signal from assistance is discovery of a relevant route, not reliable ownership of target selection or completion. A future design should expose the discovered collection and target identities, unresolved coverage, attempted effects and observed outcomes together. It must handle changed ordering and similar items without silently extending the selected set. Navigation guidance must remain distinguishable from authority to perform an effect.

The pinned site's search implementation searches submission/comment content, not author membership. Repeating an author's name in global search therefore cannot establish an empty author set. This diagnosis stayed outside helper inputs. Fixes must generalize through observed navigation and coverage, not hardcoded forum routes or benchmark IDs.

The harness now reads persisted forum name, title, description and sidebar through the actor's moderation relation and exercises their mutation/restoration in both arm orders. Every scored arm used a fresh verified backend. Assisted usage is attributed separately, included in campaign charges, and fails closed on unknown cost; the dashboard distinguishes assisted verified goals from autonomous goals. Historical contaminated reports remain invalid.

Private evidence, frozen sources, rejected variants, scope audits, exact harness snapshots and provider reconciliation are in `.runs/goal-discovery-20260929/`. This campaign measured **$0.716347** with no new unknown-charge reserve; cumulative accounted spend is **$22.894857 / $40**, retaining all earlier conservative reserves. No runtime candidate was promoted and nothing was committed, published or installed globally.
