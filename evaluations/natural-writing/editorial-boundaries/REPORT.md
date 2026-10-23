# Natural Writing: audience and artifact boundaries

> Historical editorial-boundary snapshot. The current prepared release also includes the [procedural-writing follow-up](../procedural-writing/REPORT.md); the raw results below remain unchanged.

Date: 2026-10-23. This follow-up expands the same uncommitted initial **1.0.0**
release. The [initial style study](../REPORT.md) remains historical evidence for its
own v3 snapshot, not a substitute for testing the current source.

## Scope and research review

The user asked to review process leakage and related editorial failures, tune the
skill, and run a test/fix loop. The supplied [conversation](https://chatgpt.com/share/6adbce34-bcac-83ea-b83c-6d74212bac59)
was reviewed as source material. Its main contribution is a content-selection
distinction: information available to an agent may not belong in the artifact.
Its proposed failure labels and causal explanations are not adopted as scientific
findings or prevalence estimates.

The added guidance covers irrelevant development history, metacommentary, false
contrasts with abandoned designs, unnecessary justification, hidden audience
assumptions, genre confusion, accurate-but-irrelevant material, and performative
thoroughness. Existing safeguards for source fidelity, uncertainty, useful structure,
and voice remain in force.

Primary guidance checked during the preceding review supports the distinctions:
[Google on audience](https://developers.google.com/tech-writing/one/audience),
[Diátaxis on reference](https://diataxis.fr/reference/), and
[Microsoft on architecture decision records](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record).
Reader needs can involve understanding as well as action. Reference's neutral tone
is genre-specific. Decision records deliberately preserve rationale and alternatives.
Unsupported retry counts and authentication protocols introduced by examples in the
conversation were explicitly rejected.

## Experiment

The [manifest](manifest.json) freezes the pre-edit baseline, candidate-1, 12
development/regression tasks, six independently authored reserved confirmation
tasks, and acceptance. Eight new tasks cover README, reference, architecture
decision, migration, evaluation evidence, customer email, maintenance comment, and
a board briefing. Four older tasks check uncertainty, sparse copy, voice matching,
and unnecessary editing. The held-back author saw no skill or development prompts.

Actors receive only task fields, without expected answers, assertions, or reviews.
Each arm uses a fresh context and its own frozen instructions and writing references.
**Old skill** means the previously tested v3 skill; it is not an unassisted model.
Cases within an arm share one batch context. Host writing instructions constrain
both arms. Source notes are rich synthetic prompts, not actual full coding-session
histories; this limits ecological validity.
Snapshots are actor inputs, not installable packages; linked evaluation resources
are deliberately withheld from actors. Canonical skill resource paths are validated.

Fresh independent reviewers receive randomized A/B packets and the frozen writing
and [editorial rubric](../../../skills/natural-writing/evals/editorial-rubric.md).
Two reviewers split each development comparison into disjoint six-case blocks;
scores across reviewers are not calibrated measurements. They check every assertion
and inspect unsupported claims beyond assertions. Root's unblinded semantic audit
is reported separately. No post-dispatch writing assistance is given to actors.

The exact checker qualifies with positive and intentionally invalid controls. It
checks lengths, protected strings, comment-only format and earlier exact controls;
it cannot establish relevance or factual fidelity by itself. The unblinding tool
verifies that every reviewed output matches the actual output bytes.

## First iteration

Both arms passed all **48 listed assertions** and **15 exact/format checks**.
Nevertheless, independent review found a **critical factual error in both arms**:
the customer email said the sender had no delivery date, while the source only
omitted one. The original assertions did not isolate that inference. High scores
and green assertions did not justify acceptance.

The candidate had one minor preference win and eleven ties. Mean per-case scores
were 4.96/5 candidate and 4.94/5 old skill. Those scores coexist with the critical
failure and are not an acceptance claim. Root also found that the reference entry
replaced unsupported praise with an out-of-scope explanation of why the praise
was not supported. This kept source-assessment commentary in finished reference.
See the [first outputs](iteration-1/review.html) and
[separate root audit](root-audit-iteration-1.json).

## Fix and second iteration

[Candidate-2](change-candidate-2.json) teaches two general distinctions: deleting
irrelevant material does not require a sentence explaining its rejection, and
missing source information does not establish a real-world absence or the sender's
knowledge. The example uses missing tracking information rather than copying the
tested delivery-date wording.

Two [supplemental assertions](supplemental-assertions.json) were frozen before the
next outputs, covering requested reference scope and unsupported absence/knowledge
claims. Actor prompts stayed byte-identical. Original assertions and grades were
not rewritten; the second round has 50 listed assertions, so aggregate assertion
counts are not compared as though the evaluator were unchanged. All 12 tasks were
rerun after the source change with a fresh old-skill baseline.

Candidate-2 passes all **50/50 assertions** and **15/15 exact checks**. Its mean
per-case score is **4.91/5**, with no critical failures or substantive defects.
Old skill passes 48/50 and retains a critical unsupported delivery-date claim and
an out-of-scope readiness paragraph. The candidate wins three pairs, loses none,
and ties nine. Two of those wins concern the targeted defects; the other is a minor
sparse-copy preference. Mean old-skill score is 4.73/5. Different judges and expanded
checks mean absolute scores should not be interpreted as calibrated cross-round
measurements.

The revised email limits a delivery commitment without claiming that no delivery
date is known. The independent reviewer explicitly distinguished those meanings.
The reference stays within retries, authentication and cache configuration. All
three history-positive development controls and four earlier writing controls
remain intact. See the [second comparison](iteration-2/review.html).

The [final freeze](final-freeze.json) binds candidate-2, the unchanged reserved tasks,
the evaluator rubric, and both exact checkers before confirmation output. Reserved
cases cover a capacity proposal, customer update, technical explanation, 450–600
word operational procedure, incident review and adoption memo. The last two require
failed-attempt history and rationale. No confirmation feedback has been used to
edit the candidate.

## Reserved confirmation and acceptance

Candidate-2 and old skill both pass **35/35 assertions** and **7/7 exact checks**
on the six reserved cases. Neither has critical failures or substantive defects.
Candidate-2 wins two minor preferences (procedure organization and incident-review
clarity), loses none, and ties four. Both average 5/5 on the applicable dimensions;
preferences distinguish usable outputs within those coarse scores.

The longer candidate procedure retains operational exceptions, owner roles,
escalations, and the safe-lockup condition. The incident review keeps the failed
batch-size mitigation, the causal race and undeployed fix. The adoption memo keeps
the failed import, alternatives, uncertain benefits, phone bookings, and prerequisites.
The technical explanation preserves unresolved authentication, retry, duplicate-job,
dependency and link-lifetime contracts. No reserved outcome informed a source edit.

See the [confirmation artifacts and grades](confirmation/review.html). Combined
final-candidate coverage is **18 scenarios, 85 assertions and 22 exact checks**.
All pass. Three development history-positive controls, two reserved history-positive
controls, and four previous writing controls survive. This satisfies the frozen
acceptance conditions. All **60 new outputs** from two development rounds and one
reserved round are retained, separately from the original study's 60 outputs.

This evidence supports a usable guidance extension and repair of the observed
failures. It does not establish broad statistical superiority. A synthetic packet
is an easier selection boundary than a real, long coding conversation; that remains
a limitation.

## Description review

An independent description-only interpretation matched **21/22** expected routing
decisions, including all six new documentation/history/comment cases. It disagreed
on an existing error-only proofreading case: the key expected use, while the reviewer
reasonably interpreted restricted proofreading as outside natural-style editing.
The mismatch and original key are retained rather than rescored to report 22/22.
The body respects narrow proofreading and leaves the literary control untouched.
This is a routing ambiguity, not an observed host-selection failure; actual host
automatic selection was not exercised. See [the comparison](trigger-summary.json).

## Completion audit and validation

| Requirement | Current evidence |
| --- | --- |
| Review the proposed failure types and avoid unsupported research claims | Research review above and canonical `references/research-notes.md`, with primary-source links and rejected example substitutions. |
| Tune content selection, audience assumptions, genre and historical exceptions | Canonical `SKILL.md`, `references/editorial-judgment.md`, and the linked catalog family equal the frozen candidate-2 source. |
| Run an actual test/fix loop | First shared factual failure, separate root audit, frozen general source change, supplemented tests, and the second-round paired comparison. |
| Preserve useful history, evidence, facts and voice | Five history-positive controls, four previous writing controls, independent semantic reviews, and exact checks on the final fingerprint. |
| Confirm on held-back cases | Independently authored six-case set frozen before development outcomes; one first attempt per arm after final freeze, with no outcome-driven edit. |
| Version, validate and clean up | Same prepared 1.0.0 release, root catalog/changelog coverage, structural and release validators, resource/JSON/whitespace checks, retained evidence, task-cache cleanup recorded in `validation.json`. |

The skill-creator structural validator passed on the final source using PyYAML in
a temporary uv environment; the writing skill itself has no runtime dependency.
The release contract, changed resource links, evaluator syntax, frozen source/task
hashes and reviewed-output hashes are checked. Only the task-specific validator
cache is removed. No model API, browser, container, service or scheduled job was
created. Agent reviewers and actors completed their tasks. `trial-ledger.json`
retains every first attempt and its independent verdict, including the failed first
candidate; a high assertion rate never erases a critical failure.

## Limitations and accounting

This is synthetic, session-agent evaluation, not human preference data or a public
benchmark. It does not establish universal improvement or a measured prevalence of
these failures. Some reserved genres overlap development, so confirmation is fresh
instance evidence rather than six wholly novel families. Full coding-session
contamination, additional languages, other model builds, and automatic host skill selection remain
unexercised. One longer reserved artifact tests more sustained selection, not
book-length writing.

Exact model build, sampling settings, per-case generation latency, tokens, and
session charges are unavailable. They remain unknown, not zero. No external paid
model API, publication, scheduled job, browser, or container is used in this
campaign. Temporary validator dependencies are task-scoped; evidence and failed
attempts are retained. Pre-existing repository changes are preserved.

## Reproduction

Use the frozen snapshots and task membership, keep actor and evaluator inputs
separate, randomize labels, and preserve failures and first attempts. Inspect
semantic claims in addition to the listed assertions. Confirmation that informs a
new source edit becomes development data; reserve new confirmation before claiming
another held-back evaluation.

```sh
python3 evaluations/natural-writing/editorial-boundaries/check_outputs.py
python3 evaluations/natural-writing/editorial-boundaries/check_outputs.py iteration-1
python3 evaluations/natural-writing/editorial-boundaries/summarize.py iteration-1
python3 evaluations/natural-writing/editorial-boundaries/check_outputs.py iteration-2
python3 evaluations/natural-writing/editorial-boundaries/summarize.py iteration-2
python3 evaluations/natural-writing/editorial-boundaries/check_confirmation.py --run
python3 evaluations/natural-writing/editorial-boundaries/summarize.py confirmation
```

The supplied static pages were generated with skill-creator's
`eval-viewer/generate_review.py`; the benchmark tab contains task-assertion rates,
not a human-writing score. Unknown efficiency metrics are omitted.
