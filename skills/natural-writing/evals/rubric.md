# Evaluation rubric

Compare anonymized outputs against the same request and sources. Judge the work,
not which version contains fewer watched words. Read the complete passage.

Score each applicable dimension from 1 (poor), through 3 (usable with edits), to
5 (ready to use):

| Dimension | Question |
| --- | --- |
| Fidelity | Are facts, constraints, attributions, uncertainty, and the argument intact? |
| Directness and selectivity | Does it get to useful content and omit filler without losing substance? |
| Specificity | Are concrete statements supported by the material? |
| Voice and genre | Does it match the requested writer, register, language, and medium? |
| Cadence and rhetoric | Do sentence and paragraph choices serve the thought rather than recurring formulas? |
| Structure | Do formatting and sequence help the intended reader? |
| Edit restraint | Did good prose, required wording, and useful complexity survive? |

Factual invention, lost material qualifications, changed commitments, corrupted
protected text, or disobeyed format are critical failures regardless of style.
Use exact checks for quantities, required strings, and requested formats when
appropriate. Review semantic preservation independently; substring checks cannot
prove it. Log pattern counts only as diagnostics, with legitimate uses considered.

## Experiment contract

Freeze development and confirmation prompts, source snapshots, acceptance rules,
and run conditions before reading outcomes. Generate baseline and candidate in
separate fresh agent contexts using identical tasks. Give the candidate its skill
snapshot and referenced resources, with no expected answers or rubric. Give neither
actor previous outputs, reviewer comments, or hidden assertions.

Use fresh anonymized comparisons by an evaluator who did not produce the outputs.
Check each assertion with quoted evidence. Preserve every run, including failures
and fixed-case replays. Keep first attempts, development revisions, and confirmation
results separate. Single-sample preferences are provisional editorial judgments,
not statistical evidence or human review.

Initial acceptance for this small local suite: no critical failures on final
development or confirmation outputs; candidate mean at least 4/5 on applicable
dimensions in each set; no unresolved substantive style regression against baseline;
at least one clear improvement on development tasks that invite generic writing;
and no unnecessary rewrite of the already-good control. If confirmation fails,
revise and reserve fresh confirmation instead of reporting the repaired case as
untouched evidence. Trigger cases are a separate description review, not proof of
automatic skill selection by a host.
