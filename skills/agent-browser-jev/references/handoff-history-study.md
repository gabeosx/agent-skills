> **Historical research evidence.** Agent Browser Jev was archived on October 2, 2026. Results and decisions below belong to their original snapshots; the [final research report](../RESEARCH.md) records the later NO-GO decisions. Installation and automatic campaigns are discontinued.

# Earlier handoff evidence and caller verification

The September 29, 2026 follow-up retained a bounded caller-output change together with evidence-use guidance. It reduces redundant caller verification in two limited paired checks. Jev's browser decision logic, completion judgments and resume authority are unchanged; this is not an autonomous capability gain.

## What changed

A handoff previously returned only the last two executed readbacks. The author task in the [caller workflow study](caller-workflow-study.md) had already finished, but its first page's successful effect was missing from the return. The caller revisited earlier pages to verify it.

`handoff.earlierEvidence` now adds chronological after-action readbacks preceding those last two transitions. It retains at most eight earlier records within 12,000 serialized transition characters, using the existing 2,400-character per-readback limit. Omitted actions and limited observations are explicit; absent readbacks remain null, and unknown outcomes stay unknown. Evidence is restricted to the current step and invocation. It adds no model calls, persistent trace files, permissions or completion assertions.

The skill also tells callers how to assess historical readbacks: check identity, scope, collection coverage, omissions and later actions that could supersede an earlier state. Revisit pages to resolve missing or conflicting evidence. Historical references must still never be replayed for actions. Both caller arms received exactly the same guidance in the follow-up comparisons.

## Results that received the new evidence

| Paired case | Existing handoff | Earlier evidence |
| --- | ---: | ---: |
| Original completed three-page task, old guidance: caller decisions / browser gestures | 11 / 4 | 11 / 4 |
| Same task, shared evidence-use guidance: caller decisions / browser gestures | 9 / 4 | 2 / 0 |
| Same guided task: total model cost | $0.044406 | $0.021623 |
| Fresh later-interruption fixture, guided: caller decisions / browser gestures | 23 / 10 | 9 / 3 |
| Later-interruption fixture: total model cost | $0.128962 | $0.059887 |

Every row ended with the full requested goal and correct action scope in both arms. The first experiment did **not** reduce verification gestures. Its failure remains part of the result; adding more text alone was insufficient on that attempt. The guided natural-case replay is practiced development evidence, not an untouched holdout.

In the completed task, both helpers had already reached all three targets and returned `handoff`. With guidance and earlier evidence, the caller accepted the result without another browser action. Jev's original non-complete report is preserved.

In the later-interruption fixture, both helpers stopped at `decision_budget` with only **2/4** targets reached. The candidate's return contained four earlier readbacks. The caller recognized that work remained and completed it with three actual browser gestures; the baseline needed ten, including verification. Both used one helper invocation, and both final outcomes were correct. This is genuine independent-caller takeover under an **intentionally imposed budget boundary**, not autonomous completion or an estimate of natural takeover frequency. It did not involve a resume call.

The added evidence was about **5,500 JSON characters** in each guided case. The lower caller cost in these paired runs outweighed that extra input. Other workflows may not benefit; provider caching, model variability and the very small sample prevent a general cost or reliability claim.

## Cases that did not receive the new field

The primary matrix also included a fresh five-page natural task and an early-interruption fixture. These remain reported, but cannot establish an effect of the added history:

- Both five-page helpers returned `reported_complete`, so neither caller received handoff history. Caller decisions varied from 7 to 17 despite no treatment exposure. Both final states and scopes were correct.
- The early interruption stopped after two gestures because its decision budget was exhausted before the action cap. Two readbacks already fit in the existing return, leaving no earlier evidence to add. Both caller arms resumed Jev and completed the task. Their first comparison varied from 18 to 5 caller decisions; a guided replay used 16 in both arms. Those differences are not credited to the new field.

The later-interruption fixture was predeclared after discovering that exposure gap. It used a fresh collection and a larger initial action allowance while remaining too short to finish the goal. Its actual return was independently checked as incomplete and as containing the new history. No result or source was silently replaced.

## Method and limits

There were **15 scored runs across four authored scenarios**, including repeated development comparisons and two deliberately interrupted fixtures. They are practiced author-matching workflows, not official WebArena tasks, unrelated held-out families or production reliability evidence. The full primary matrix used direct caller, original handoff and enriched handoff arms; the focused follow-ups paired the two caller-with-helper arms. All used the bounded GPT-5.4 caller, common browser refresh guidance, 30 shared browser gestures and 180 seconds per trial. The caller supplied the original goal, not an end-to-end plan.

Twelve no-model qualification cycles operated rendered controls and verified restoration in both arm orders. All records were reachable through the actual pagination. Independent saved-state and complete persisted-event checks retained wrong/extra effects even if later undone. No scope violation or premature completion occurred in this sample. First helper returns, final caller assessments, forced recovery and actual treatment exposure remain separate. The first helper state, persisted effects and return reason matched within every assisted pair.

The frozen baseline and candidate initially differed only in result assembly. A subsequent null-readback guard was checked offline; replaying all 16 scored helper returns proved it leaves their output unchanged. The retained skill paragraph matches the guided experiment. The working suite passes **364 offline tests**. No broad MiniWoB or WebArena campaign was repeated for this caller-output change, and earlier autonomous scores are not newly earned by this experiment.

## Accounting and disposition

Measured cost was **$0.977934**: $0.532323 primary, $0.256763 guided follow-up and $0.188849 later-interruption check. Provider key usage matched exactly. Cumulative measured spend is **$8.277731**; conservative accounting is **$25.806306 / $40**, retaining previous reserves and leaving **$14.193694**. All paid runs finished before the existing 20:32:20 UTC deadline.

The bounded history and guidance are retained under pending **Agent Browser Jev 1.3.0**. All owned browser sessions and fixture servers closed. Nothing was committed, published or installed globally. Private evidence is in `.runs/handoff-history-20260929/`: frozen sources, plans and clarifications, original and follow-up reports, state audits, exposure checks, exact usage receipts and final validation. The [capability scorecard](capability-status.md) and [dashboard](http://127.0.0.1:8765/) retain the initial null result and the cases without treatment exposure.
