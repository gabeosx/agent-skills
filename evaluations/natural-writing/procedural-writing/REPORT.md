# Natural Writing: procedural-writing follow-up

October 23, 2026. This study extends the same prepared Natural Writing **1.0.0**
release. The [initial style study](../REPORT.md) and
[editorial-boundary study](../editorial-boundaries/REPORT.md) describe their frozen
snapshots. This follow-up tests the added procedural guidance.

## Source and scope

The user supplied feedback from a Formul.app documentation rewrite and an independent
blind grader's report. Its useful additions were executable checks, a separate
coverage review after substantial rewriting, and a clear normal route with
symptom-triggered recovery. The report concerned the whole rewrite workflow:
research, runtime verification, and independent review also contributed. It does
not establish a causal skill effect. The [provenance record](field-feedback.json)
records the source hash and scope without publishing the private report itself.

The skill gained one procedural paragraph and a
[focused reference](../../../skills/natural-writing/references/procedural-writing.md).
Live UI, screenshots, links, and runtime verification remain the relevant domain
or documentation workflow's responsibility. No Formul.app behavior was inferred
or tested here; all scenarios use fictional products and controlled facts.

## Controlled comparison

The [first experiment contract](experiment.json) freezes the prior skill,
candidate 1, five development cases, and three independently authored reserved
cases before opening outcomes. [Experiment 2](experiment-2.json) freezes the
source-boundary repair before the second development round. SHA-256 fingerprints
cover the source snapshots and original task files.

Three configurations receive identical prompts and evidence: the previous skill,
the updated skill, and no writing skill. Actors receive only prompt/files, without
expected outputs or assertions. Each configuration uses a fresh session subagent
context; cases within a configuration share that actor. The inherited host writing
instructions constrain every arm. Exact backend builds, tokens, model runtime, and
billing are unavailable and are not reported as zero.

Actors stop at their first draft. Every arm then receives the same independent
coverage review against its original/current evidence; no feedback reaches an actor
before first-draft scoring. This isolates text guidance from extra reviewer help,
but does not test whether the skill autonomously dispatches a reviewer. There is
no live research, runtime access, external model API, or hidden-answer access.

A fresh reviewer per round sees shuffled A/B/C labels and the same task/assertions,
without skill sources or label mappings. It records evidence, usefulness, fidelity,
naturalness, severity, and preferences. Acceptance requires all candidate assertions
and the exact proofreading control, no critical or substantive defects, and
usefulness/fidelity scores of at least 4/5. Ties are acceptable.

## Development and repair

Candidate 1 passed **14/15** assertions. The reviewer caught an unsupported instruction
to check matching identifiers in a preview, when the source established only that
rows could be previewed. Both baselines passed 15/15. Four scenarios tied; both
baselines were preferred on the audit scenario. The failure and source remain in
[development](development/summary.json) and [candidate 1](snapshots/candidate-1/).

The repair adds a general distinction: a screen existing does not establish which
values, comparisons, or warnings it displays. Unsupported checks must remain a
verification gap rather than become product capabilities.

Candidate 2 passed **15/15** development assertions, including the failed audit.
All five preferences were three-way ties, all three dimensions averaged 5/5, and
no critical or substantive defect was found in any arm. The unchanged baseline
drafts were reused byte-for-byte rather than resampled. Candidate 2 used a fresh
actor and a fresh blind reviewer. See [the second-round summary](development-2/summary.json).

## Reserved confirmation

Candidate 2 and both baselines passed **15/15** assertions on all three independently
reserved scenarios: delivery verification with an unknown partner copy, a current
export rewrite with a preserved attachment boundary, and sensor setup with
conditional recovery. All preferences were three-way ties, all dimensions averaged
5/5, and the reviewer found no critical or substantive defects. No confirmation
feedback changed the candidate. See [the confirmation summary](confirmation/summary.json).

Across the final eight scenarios, the candidate passes **30/30** assertions and the
exact literary proofreading control. It meets the predeclared acceptance criteria.
The previous-skill and no-skill arms also pass 30/30: this study establishes usable
matched outputs and no observed final regression, not an incremental performance
benefit. There were 29 newly generated drafts: 15 first-round development, five
repaired-candidate drafts, and nine confirmation drafts; the second round's ten
baseline files are preserved copies, not additional trials.

## Review artifacts and limits

The static viewers retain the drafts and per-run assertion evidence:
[first development](development/review.html),
[repaired development](development-2/review.html), and
[confirmation](confirmation/review.html).
Raw anonymized reviews, label mappings, actor inputs, source snapshots, first
outputs, and unknown-metric run records remain beside this report. The no-skill
actor normalized names into slugged directories for confirmation; the harness
[moved those directories](path-normalization.json) without changing bytes or rerunning drafts.

The development results show an observed failure repaired on practiced cases,
not a superiority estimate. The strong supplied facts and host instructions can
make these tasks easy for every arm. Single model drafts and single agent reviews
are not human validation, detector results, or evidence of universal naturalness.
Earlier controls cover additional genres at their historical snapshots; this
follow-up does not claim that every old task was rerun on the current source.

The [repository README exercise](../repository-docs/coverage-review.md) is a separate
workflow application with source verification and independent review. It preserved
historical records and caught factual documentation errors. Its success should not
be attributed to the writing skill alone.

## Repository validation

The [validation record](validation.json) covers skill structure, resource paths,
JSON, source/output fingerprints, exact-control checks, archive discovery, and
release bookkeeping. The first release-contract check rejected the changed Jev
README at its unchanged 2.0.0 archive version; the prepared archive documentation
patch is now 2.0.1, with its initial retirement and historical runtime distinguished.
The first staged whitespace check found literal spaces required by the preserved
unified-diff evidence; a `.gitattributes` exception is scoped to that artifact,
leaving its bytes intact. No raw output was rewritten to pass validation.

Public-only full-depth discovery with skills CLI 1.7.4 finds the seven active skills,
including Natural Writing, and excludes archived Jev. The GitHub installation
readback is recorded separately after publication. The documentation patches are
Apple Container 1.3.1, MacWhisper 1.0.1, and Jev archive contract 2.0.1; Natural
Writing remains the one prepared initial 1.0.0 release.
