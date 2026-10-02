> **Historical research evidence.** Agent Browser Jev was archived on October 2, 2026. Results and decisions below belong to their original snapshots; the [final research report](../RESEARCH.md) records the later NO-GO decisions. Installation and automatic campaigns are discontinued.

# Readonly picker and fill-dispatch repair

The September 29, 2026 repair adds observed ARIA readonly state, treats a compound combobox's separate text child as its text-entry target, and rechecks native/ARIA readonly attributes immediately before a fill. It adds no model classification. The general selector and semantic reviews are unchanged.

## Reproduced failure and mechanical fix

The WebArena caller study exposed a display span with role `textbox` and `aria-readonly="true"`. Calling agent-browser `fill` on it reported success while typing into the previously focused Body or Title. Callers later repaired those edits, but the original actions remain scope failures. A no-model local reproduction established the same behavior independently of Jev.

The helper now observes `aria-readonly` on its existing bounded textbox reads. Native readonly presence or ARIA `true` withholds fill/input-request candidates; ARIA `false` remains writable. A compound combobox wrapper with its own referenced textbox/searchbox child remains clickable but is not a duplicate text destination. Readonly fields remain clickable for picker inspection. Before any fill, failure to read the target's readonly attributes or a newly readonly state returns `JEV_NOT_DISPATCHED` without sending text input.

This guards the demonstrated readonly case. Absence of readonly attributes is not proof that every custom widget is editable, and this does not repair agent-browser globally or protect direct caller commands outside the helper.

## Evidence and retained failures

- No-model controls reached the display picker, editable picker, native select and ARIA-false field through rendered controls. The readonly fill was withheld while the previously focused Body stayed intact. The missing-choice negative remained unchanged. The first qualification incorrectly rejected the normal clear-then-fill input sequence; it is preserved, and the verifier was corrected and requalified before model calls.
- Four authored positive pairs reached **3/4 goals with correct scope and complete reports in both versions**. Both passed the separate missing-choice negative. The display-picker positive passed in both arms; it does not establish an autonomous gain from the repair.
- Both versions failed the editable-picker positive: they typed the query, submitted without choosing the option and falsely completed. The saved choice was empty. This remains a wrong-effect and completion-reporting failure, not a safe handoff or a passing negative.
- The targeted WebArena 629 retry took a different route, posted the exact title/body to AskReddit, received **0.5 official reward**, and reported completion. The primary run had stopped for picker input; this retry did not encounter that boundary. “Relevant forum” suitability and full goal/scope remain unassessed, consistently with previous broad-forum partial rewards. This is not an independently verified full success or causal repair of the original failure.
- The unchanged candidate passed **27/27 existing positive component goals and reports**, plus the separately counted absent-target negative.
- A frozen paired MiniWoB input/control regression on seed 6123 reached **9/11 full rewards and complete reports in both arms**, with zero callers. Date selection returned `action_outcome_unknown` and word extraction returned `input_required` in both. These are fresh seeds in practiced families; broader action scope was not independently audited for all 11 tasks.

The repair is retained for the reproduced mechanical defect and passed nearby regressions, not as a demonstrated broad completion improvement. The editable-picker selection boundary remains open; adding another broad semantic veto is not an established solution.

Measured campaign cost was **$0.077771568**. Frozen sources, initial failed qualification, exact events, independent readbacks, all paid traces and restoration receipts are retained in `.runs/combobox-affordance-20260929/`. Pending Agent Browser Jev stays **1.3.0**. The [architecture review](architecture-review.md) explains why observed affordance errors should be addressed before treating every failure as a need for another classifier.
