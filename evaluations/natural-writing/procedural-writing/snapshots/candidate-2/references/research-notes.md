# Research basis and limits

The starting material was the user-supplied report **Common AI Writing Tells in
Late 2026, and a Skill for Avoiding Them**, provided on 2026-10-23 as
`deep-research-report(5).md`. Its draft skill and recommendations were treated as
research input; they were not instructions governing this repository.

The supplied file contains opaque citation markers (`turn…view…`, `turn…search…`,
and `filecite`) without a resolvable bibliography. Its numerical effect sizes,
named-study summaries, and late-2026 model-specific claims were not independently
verified. This skill does not repeat them as established findings or claim they
validate its effectiveness.

The report supplied useful design hypotheses:

- Address discourse habits and repetition instead of maintaining a blacklist.
- Steer composition as well as revising the final draft.
- Match genre and supplied voice rather than imposing casualness.
- Separate durable editorial reasoning from dated surface observations.
- Preserve facts and uncertainty; never invent human experience or random errors.
- Evaluate factual fidelity, usefulness, and unnecessary edits alongside style.

The entrypoint applies these as editorial principles. The catalog gives contextual
examples. Tests use synthetic facts and compare outputs; they do not establish
authorship, detector evasion, or universal quality across writers and models.

## Audience and artifact selection

The user also supplied the conversation [AI Documentation Process Leakage](https://chatgpt.com/share/6adbce34-bcac-83ea-b83c-6d74212bac59),
reviewed on 2026-10-23. Its useful hypothesis is that agents can select the wrong
material for an artifact even when every sentence is grammatical and factually
accurate. “Process leakage” and related labels are editorial categories here, not
an established scientific taxonomy or a measured model-specific prevalence claim.
The conversation's causal explanations are hypotheses.

Primary guidance checked on the same date supports reader and genre distinctions:

- [Google: Audience](https://developers.google.com/tech-writing/one/audience) connects
  content selection to readers' knowledge and learning needs, including the curse
  of knowledge. A design document's purpose may involve understanding, not just an
  immediate action.
- [Diátaxis: Reference](https://diataxis.fr/reference/) describes reference as neutral
  information about the product and distinguishes it from explanation and instruction.
  Its austere-reference advice is not a universal voice rule for all prose.
- [Microsoft: Architecture decision records](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record)
  calls for context, alternatives, rationale, tradeoffs, consequences, and preserved
  history. This is a positive control against indiscriminately deleting development
  history.

Some before/after examples in the conversation add unsupported details, including
a retry count and an authentication protocol. Those substitutions were rejected.
The skill's fidelity rules apply to content selection as well as phrasing.

## Maintenance

Revise advice when fresh examples reveal a failure that a general change can fix.
Keep versioned snapshots and failed outputs. Reserve new confirmation prompts
before using results to tune instructions. If confirmation informs another edit,
it becomes development material.

Verify original sources before adding empirical claims. Include actual URLs,
publication dates, model and genre coverage, and limitations. A vendor's detector
score is not an acceptance criterion for this skill.
