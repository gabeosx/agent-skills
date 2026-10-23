# Natural Writing 1.0.0 evaluation

> For the latest procedural additions and matched comparisons, see the [procedural-writing follow-up](procedural-writing/REPORT.md). This initial study remains evidence for its own frozen snapshots.

This is the preserved initial style study of snapshot v3. The same uncommitted
1.0.0 release is being expanded for audience and artifact boundaries; see the
[follow-up study](editorial-boundaries/REPORT.md) for its current candidate and
validation. The results and source hashes below apply to the original snapshot.

Date: 2026-10-23. This is a local, synthetic writing study using the session's
agents. It is not a public benchmark, an authorship test, or human preference data.

## Method

Eight development cases cover a founder announcement, an uncertain study summary,
sparse product copy, a technical distinction, voice-matched email, already-good
literary prose, a command-preserving runbook, and a situated opinion. Another agent
authored six reserved confirmation cases before development outcomes were opened.
The original [manifest](manifest.json) freezes membership, source hashes, conditions,
and acceptance rules. The [rubric](../../skills/natural-writing/evals/rubric.md)
sets fidelity as a gate and evaluates style in context.

Each comparison used fresh baseline and candidate agent contexts with the same
tasks. Actors received prompt fields only, without expected outputs or assertions.
Candidate actors read frozen instructions and the catalog; baseline actors read no
writing skill. Each actor wrote a batch of cases, so cases within an arm share
context. The host's developer instructions already constrain both arms toward
plain writing. This is a strong baseline and a confound for causal attribution.
Actor snapshots contain the prose instructions and writing references only;
evaluation resources linked by the canonical skill are deliberately withheld.
These snapshots are experiment inputs, not standalone installable skill packages.

A fresh independent reviewer received anonymized A/B packets, the original tasks,
and the rubric. Labels were shuffled per case. Reviews quote assertion evidence
and assess fidelity, specificity, voice, rhetoric, structure, and edit restraint.
`summarize.py` checks that reviewed bytes match the actual outputs before unblinding.
`check_outputs.py` independently checks exact prose, protected commands, numbered
steps, paragraph format, and word ranges. Positive and deliberately corrupted
negative controls qualify that checker. These exact checks cannot prove semantic
fidelity or naturalness.

## First attempt: v1

Both configurations passed all 28 task assertions and all 11 exact/format checks.
There were no critical failures. The blind reviewer preferred the baseline on
four of eight pairs and tied four; the candidate won none. Mean per-case editorial
scores were **4.81/5 candidate** and **4.93/5 baseline**. These are one reviewer's
subjective judgments, not calibrated measurements.

The candidate's sparse product copy repeated its features and described its own
straightforwardness. Its announcement narrated an intention to be clear after
already giving the relevant limit. It also added unnecessary narration to the
local opinion paragraph. The independent review and root audit agreed on those
weaknesses. Root supplied one symmetric follow-up concern to the first reviewer;
the exact message, timing, and unchanged judgments are recorded in that review.

The first attempt is retained in [iteration-1](iteration-1/review.html), with raw
outputs, assertion evidence, anonymized packets, mappings, and the complete v1
source snapshot. It is not overwritten by subsequent results.

## Revision

[The v2 change record](change-v2.json) links the failures to a general adjustment:
make every sentence contribute information, a relationship, or voice; avoid
word-count padding and self-praise for simple or honest prose; preserve the warmth
and conviction requested by the genre. No test answer or domain-specific phrase
was added to the skill. All eight development prompts were rerun with fresh actors
and a fresh baseline after freezing v2.

The v2 blind comparison passed the same 28 assertions and 11 exact/format checks
per arm, with no critical failures. It produced **one candidate win, one loss, and
six ties**. Scores were **4.76/5 candidate**, **4.81/5 baseline**. The candidate's
product copy still repeated the fact of replaceability instead of explaining what
it permits. The baseline did that better. The candidate's local opinion was more
economical. The product-copy regression remained unresolved, so v2 was not accepted.
The complete [second comparison](iteration-2/review.html) is retained.

[The v3 change record](change-v3.json) adds a distinction between a direct implication
of a known feature and an unsupported claim about performance, quality, savings,
or people's reactions. Its example uses a removable tray, unrelated to the test
products. The same eight development tasks and fresh baseline were rerun after
freezing v3; reserved confirmation was still unused.

## Final development comparison: v3

The frozen final candidate passed **28/28 task assertions** and **11/11 exact/format
checks**. Baseline passed the same checks. The reviewer preferred the candidate on
**three pairs**, preferred baseline on **none**, and tied **five**. Mean per-case
editorial scores were **4.89/5 candidate**, **4.80/5 baseline**. This met the frozen
development gate: no critical failures, mean above 4, concrete improvements, no
substantive regression, and the already-good control left unchanged.

The preferences concerned a more selective announcement, a clearer explanation of
the product's replaceable component, and a technical explanation focused on the
administrator's recovery decision. They are modest editorial differences. Sparse
product facts combined with a strict word minimum still produced some repetition;
the reviewer judged neither product version especially compelling. That remains a
quality limitation rather than evidence that the skill solves sparse briefs.

See the [final development review](iteration-3/review.html) and
[frozen candidate/harness hashes](candidate-freeze.json). The final source is v3;
v1 and v2 scores are not borrowed to fill any final-candidate coverage gap.

## Reserved confirmation

Six cases were run once per arm after the v3 freeze: a second literary control,
a decision memo, a conditional operating checklist, an incident note containing a
hostile instruction as quoted evidence, a Rioplatense Spanish message, and a
deliberately theatrical invitation. Some genres overlap development, so these are
fresh instances, not six entirely new task families. No confirmation feedback was
used to change the skill.

Both arms passed **36/36 assertions** and **10/10 exact/format checks**, with no
critical failures. Five pairs tied; the reviewer preferred the baseline invitation's
cadence on one. Mean per-case scores were **4.94/5 candidate**, **5.00/5 baseline**.
The reviewer explicitly assessed that preference as minor, with both invitations
usable and neither needing an edit before use. Root requested that severity
clarification before unblinding; the original scores and preference did not change.
The report uses equal weight per case; the reviewer's dimension-weighted mean for
the candidate is 4.95/5.

The frozen confirmation gate is met: no critical failures, a mean above 4, no
substantive style regression, and the protected prose unchanged. The confirmation
set does **not** show a quality advantage over baseline. Together with development,
it supports a usable initial release with preserved fidelity and some contextual
editing benefits, not a general superiority claim.

See the [confirmation outputs and grades](confirmation/review.html),
[independent review](blind/confirmation/review.json), and [root audit](root-audit.json).
Across three development rounds and confirmation, all **60 generated outputs**
are retained. The final candidate covers 14 scenarios, passes all **64 task
assertions** and **21 exact/format checks**, and leaves both literary controls intact.

## Description and release checks

An independent interpretation of the skill description matched **16/16** intended
routing decisions (eight positive and eight near-miss negative cases). This is
[description review](trigger-review.json), not an actual host-selection experiment.

The final skill passes the skill-creator structural validator, local resource-link
and JSON checks, the repository release-contract validator, and `git diff --check`.
The evaluator scripts parse, their exact checker passes positive and deliberate
negative controls, all reviewed bytes match the delivered outputs, and final source
and reserved-task hashes match the frozen records. Validation uses initial release
**1.0.0**, with the matching root changelog and catalog entry.

System Python lacked PyYAML. The required structural validator ran successfully
using PyYAML in a task-specific temporary uv environment. That cache is removed
after final checks; no viewer server, container, browser, automation, or background
job was started. Evidence is retained, and pre-existing untracked repository work
is preserved. See `validation.json` for the final check and cleanup record.

## Limits and accounting

- No human reviewer has evaluated these outputs. Agent-written examples and an
  agent judge can share preferences and failure modes. Single samples cannot
  measure variance or demonstrate universal gains.
- The supplied research has unresolved citation markers. Its empirical claims and
  model-era observations remain unverified; the skill uses them as design hypotheses.
- Automatic host skill selection was not exercised. Sixteen separate routing cases
  test an independent agent's interpretation of the description only.
- Long-form sustained voice, additional languages, and other model builds remain
  untested. English and one Spanish case cannot establish broad multilingual quality.
- Exact model build, sampling parameters, per-case tokens, and session charges were
  not exposed. No external paid API calls were made. Unknown session cost is not
  recorded as zero. Initial baseline timestamps measure file serialization, not
  generation; no speed or efficiency comparison is made.
- Tasks write synthetic local artifacts only. There are no external sends,
  publications, accounts, browsers, backend mutations, or scheduled jobs to clean up.

## Reproduction

Read the manifest and rubric. Freeze a candidate snapshot, use fresh actors with
only task fields, randomize A/B labels, and have a fresh reviewer evaluate the saved
packets without accessing mappings or skill instructions. Keep all started samples;
do not resample a failure silently. Confirmation becomes development material if
its outcomes inform another instruction edit.

The local exact checker and unblinding summaries can be rerun without a model:

```sh
python3 evaluations/natural-writing/check_outputs.py
python3 evaluations/natural-writing/check_outputs.py evaluations/natural-writing/iteration-1
python3 evaluations/natural-writing/summarize.py iteration-1
python3 evaluations/natural-writing/check_outputs.py evaluations/natural-writing/iteration-3
python3 evaluations/natural-writing/summarize.py iteration-3
python3 evaluations/natural-writing/check_outputs.py evaluations/natural-writing/confirmation
python3 evaluations/natural-writing/summarize.py confirmation
```

Run the skill-creator `eval-viewer/generate_review.py` against an iteration with
its `benchmark.json` to regenerate the supplied static review pages. Time and token
statistics are deliberately omitted because they are unavailable.
