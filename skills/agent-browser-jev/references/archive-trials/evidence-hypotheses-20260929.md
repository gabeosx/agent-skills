> **Archived trial summary.** This report describes its historical checkpoint, not a supported release or instruction to continue. Local/private links have been replaced with provenance labels. The [final research report](../../RESEARCH.md) records later decisions.

# Evidence, membership and target-set experiments

Reviewed September 29, 2026. **Keep the current v10 runtime.** Six experiment themes tested techniques from the GitHub and official-documentation review. Some isolated judgments improved, but no browser controller met the promotion rule. All candidates remain private experimental snapshots.

## Design and evidence limits

The experiment ran **54 authored browser trials and 67 separate paid decision requests**. These counts include expected negatives, failed experiments and an initial fixture that did not activate its intended treatment. They are not a combined success denominator. No new WebArena or MiniWoB reward was measured, no independent task-family holdout was used, and no caller intervened after delegation.

Each browser arm started from fresh in-memory application state. No-model checks exercised positive and negative outcomes, wrong-effect detection and restoration in both arm orders. Browser actions and server-side event/state readbacks independently established goal and scope; completion claims were recorded separately. Frozen first-attempt baseline results were reused for later goal-instruction and target-set candidates, without resampling the baseline. Model variation and browser reference differences remain possible confounds in these small samples.

One authored reverse-order goal said “original top three” without explicitly saying highest-scoring. On a page sorted lowest-score-first, both interpretations are plausible. Its original author-intended scores remain in raw reports, but semantic goal and scope are unassessed. The tables below exclude that one case and report the exclusion; this does not remove its charges or traces. Later decision probes used explicit highest/lowest-scoring wording.

## Browser outcomes

The core fixture set contained five unambiguous positive tasks, one ambiguous ranking task and two expected negatives. The negatives were an unranked featured list and an explicitly unavailable continuation of an author archive.

| Controller | Verified full goal and correct scope / 5 | Verified goals also reported complete | Wrong-effect tasks / 5 | False completions / 5 | Negative checks / 2 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Current v10 | 4 | 2 | 0 | 1 | 2 |
| Complete text of four recent transitions | 3 | 2 | 1 | 1 | 2 |
| Complete text of twelve recent transitions | 3 | 2 | 1 | 1 | 2 |
| Exact caller goal in structured question instructions | 3 | 2 | 0 | 0 | 1 |
| Concrete ranked target-set evidence | 3 | 2 | 0 | 1 | 2 |

With the ambiguous case included under the original authored verifier, the baseline was 4/6 and every candidate above was 3/6. Retaining more text did not establish a benefit: the four-transition candidate gained one paginated-author task but lost two previously completed tasks. Both expanded-history variants voted on an extra item after scores changed. Twelve transitions provided no net gain over four. The structured-instruction candidate falsely completed the explicitly incomplete archive; that negative failure is additional to the positive-task false-completion column.

Inspection memory was tested separately on two large author-filtered collections after a no-model check proved that the real adapter exposed multiple windows. Both baseline and candidate completed **0/2** full goals, with no wrong effects or false completion reports. Memory increased correctly performed likes from **6/16 to 8/16** and reduced total inspections from **140 to 78**, but the effect differed sharply between cases: inspections rose from 47 to 75 in one and fell from 93 to 3 in the other. Calls were 157 versus 102. Both candidate returns were unfinished handoffs. Partial work and fewer calls do not establish full autonomous completion.

The initial smaller inspection fixtures remained within one observation. Their eight trials are preserved separately and cannot establish an inspection-memory effect. The repair changed only fixture size, was documented before rerunning, and passed a real-adapter window check. The structured-goal variant also completed 0/2 on the large collections.

## Decision-level hypotheses

**Separate object membership from the proposed action.** On six unambiguous captured authored states, batched membership questions produced **26/26 correct item labels and 6/6 exact observed sets**, versus **24/26 and 5/6** for action-coupled qualification. Both had zero false-positive labels on this subset. The difference concerned already-satisfied objects: an object can belong to the requested set even when its effect must not be repeated. The seventh, ambiguous ranking state remains separately unassessed. This diagnostic supplies no browser completion or coverage guarantee.

**Have Jev bind the metric, direction and count; let code sort and count.** Seven explicitly worded counterfactual goals on two captured authored pages produced **6/7 exact sets** with bound arithmetic versus **5/7** with direct membership classification. Code corrected one counting error. Both methods selected objects from a clearly wrong collection. Numeric correctness does not establish semantic scope.

**Put the exact goal in structured question instructions.** Repeating that diagnostic with the goal explicitly attached to each question yielded **7/7** for bound arithmetic and **6/7** for direct membership; the latter still accepted the wrong collection. The pinned SDK's outbound serializer was checked to preserve structured instructions, and the provider accepted the metered requests. This change nevertheless regressed browser performance and a negative boundary, so it was not promoted.

**Preserve a concrete target set during mutation.** The advisory prototype bound a complete collection, metric, direction, count and fixed membership lifetime through Jev, then computed selected identities in code. It supported only bounded complete collections, unique exact headings and unambiguous numeric values; unknown scope, adaptive lifetime, ties and missing identities did not establish a set. It added metered decisions and bypassed no action checks.

On the changing-score task, recorded bindings and frozen code reconstruct the correct initial four identities. It performed three correct votes, then downstream review repeatedly rejected the remaining selected object as a wrong target. The baseline completed that task. This demonstrates contradictory binding and review results, without establishing which field the model internally attended to. Adding correct advisory facts alone did not resolve the conflict.

## Decision

No runtime candidate was promoted. The useful narrow result is that object membership, numeric binding and arithmetic can be tested separately. The current difficulty is turning those results into consistent selection, action review, progress accounting and completion judgments. A future controller experiment needs an explicit contract for retaining or invalidating a resolved fact, with counterexamples for wrong scope, stale identity and incomplete coverage. Repeating context expansion or adding another general review is not supported by these results.

This was a focused causal audit, not the comprehensive cross-version failure review. The existing WebArena results and their limits are unchanged. Caller assistance was zero in these experiments; the effectiveness and effort of caller recovery were not measured.

The experiment measured **$0.361893**, exactly reconciled to provider usage. Cumulative measured charges are **$5.728174**; conservative cumulative accounting is **$23.256749 / $40**, preserving all prior reserves. All calls finished within the authorized window. Owned browser sessions and HTTP servers were closed; the persistent dashboard remains available. The detailed machine-readable audit is audit.json (private source record). Plans, raw reports, frozen snapshots, validation logs and charge records are retained beside this summary. Nothing was committed, published or installed globally.
