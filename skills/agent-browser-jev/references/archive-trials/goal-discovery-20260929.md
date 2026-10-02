> **Archived trial summary.** This report describes its historical checkpoint, not a supported release or instruction to continue. Local/private links have been replaced with provenance labels. The [final research report](../../RESEARCH.md) records later decisions.

# Goal discovery campaign — final receipt

Completed September 29, 2026. Keep the current v10 runtime. No experimental runtime candidate was promoted. Caller input remained the original natural-language goal; no end-to-end caller plan or hidden evaluator answer was supplied.

## Decision

Jev stage/target memory did not improve verified external task completion. Reduced context and removal of semantic reviews regressed local outcomes. An independent planner discovered a useful route in one case but also supplied an incorrect ordinal target in another. The next design to test is an evidence-backed record of discovered target identities, remaining coverage and verified effects. This is a recommendation, not an implemented or validated new capability.

## Results

- Self-authored discovery positives: v10 7/7; reduced selection context 6/7; reduced context plus stage memory 5/7; full context plus stage memory 6/7; stage memory shared with review 7/7; semantic reviews removed 6/7 with one wrong subscription and false completion. Each separate negative stopped appropriately.
- Isolated WebArena shared-state comparison: 3/7 full official rewards and verified goal/scope in each arm on practiced development instances. Candidate used 208 Jev calls versus 139 baseline. Completion reports were 4 versus 5; proven false completions 0 versus 1. One ambiguous forum-suitability outcome per arm remains unassessed.
- Predeclared unopened instances of seven practiced templates: 2/7 full official rewards and verified goal/scope per arm; calls 233 versus 194. Calibration 399 passed in both arms and is excluded. These are not unseen families or full-benchmark coverage.
- Earlier full-state comparison: 3/7 versus 2/7 official reward. Baseline subsequently reached 3/7 without a runtime change, so no stable improvement was established. Missing earlier forum-description readback remains unverified.
- Frozen reviewer diagnostic: full evidence 9/10 correct classifications versus 4/10 for narrowed target/peer/control evidence. This is classification evidence, not browser-task success.
- Independent recovery versus equal-budget unchanged-goal restarts: full official reward 0/3 in both arms; independently verified full goal and correct scope 1/3 assisted versus 0/3 unassisted. The assisted arm had one wrong-effect task, the control none. All six initial Jev invocations handed off. Candidate final returns remained unfinished; control had one contradicted completion report.
- Assisted author case 729 achieved the full goal and correct scope, returned decision_budget and received official reward 0.5. Exact evaluator rejection cause is unconfirmed. Ranking case 717 improved partial reward to 0.6 while downvoting the wrong fifth-ranked item and leaving one required target untouched. Neither partial reward nor planner involvement is counted as autonomous success.

## Artifacts and integrity

The public report is ../../references/goal-discovery-experiments.md. Raw trials, frozen source copies, rejected variants, initial and final handoffs, independent scope audits and expected classifier labels are preserved here. Four append-only campaign chains contain 58 events and 25 paired reports / 50 WebArena arms. Local evidence covers 80 trials and 20 classifier decisions. See evidence-verification-final.json for source, snapshot, report and clean-start hash validation.

The working helper byte-matches frozen baseline v10:
`eb506146b1328296df4fd894407474a05bcf672ef93a141e441228adede4a99b`.

Final qualified, unscored harness fingerprint:
`b7ef3c913a8c3fc0000749a4b4d00068be817c3442bd48633c35c896e395812b`.

Scored experiments retain their actual frozen harnesses. The final harness additionally stops before another arm when assistance cost is unknown. All scored assistance charges were known. Persisted moderated-forum fields and both mutation/restoration orders were checked; dirty dispatch was rejected. Historical contaminated runs remain invalid.

## Validation and cleanup

Working offline suite: 304/304 pass. Both skill structural validators pass. Changed documentation: 57 links, zero failures. Release contract and git diff whitespace checks pass. Provider usage reconciles exactly to recorded campaign charges. Experiment-private regression tests and rejected failures are retained; see their original logs.

The owned WebArena container and network were removed after a pristine-state check. Existing Docker resources were preserved. Persistent dashboard remains at the private local dashboard and separates assisted verified goals from autonomous goals. See cleanup-final.json and validation-final.json.

## Spend and release

Campaign measured spend: $0.716346552; new unknown/reserved charges: $0. Cumulative measured: $5.366281548; cumulative conservatively accounted: $22.894856598 of $40, retaining prior reserves. The approved window was 12:32:20–16:32:20 UTC; paid work is finished within that window.

Pending versions remain Agent Browser Jev 1.3.0 and Benchmark Improvement Loop 1.1.0. Existing uncommitted work was preserved. Nothing was committed, published or installed globally.
