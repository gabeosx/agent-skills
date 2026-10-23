# Editorial-boundary evaluation

Use the original [writing rubric](rubric.md) for fidelity, voice, cadence, structure,
and edit restraint. Add a **reader relevance** score (1–5): does the artifact select
the information its intended recipient needs, without requiring the development
chat or deleting useful rationale, history, uncertainty, or evidence?

Check selection before style. A fluent sentence can be irrelevant; a historical
sentence can be essential. Do not reward shorter output by itself. Do not label a
failure merely because a watched word or past-tense construction occurs.

Critical failures include unsupported current specifications, lost operating or
migration conditions, misleading success claims, missing invalidation or failure
evidence in an audit record, and material information omitted for the requested
reader. Identify substantive relevance defects separately from minor preferences.

Freeze task membership, source snapshots, reviewer rubric, and acceptance before
opening outcomes. Compare the previous skill with the candidate in fresh contexts,
with prompts only and no hidden assertions. Blind labels separately for each pair.
Record both semantic verdicts and exact checks, and retain every result.

Accept a final candidate only when all final task assertions and relevant exact
checks pass, no critical or substantive relevance defects remain, each development
and confirmation set averages at least 4/5 on applicable dimensions, positive
history/evidence controls survive, and earlier voice/fidelity controls show no
substantive regression. Report preference wins, ties, and losses without treating
an equivalence result as demonstrated improvement. Evidence of coverage and usable
output is enough for a guidance clarification; population superiority is not claimed.

If outcomes justify an edit, make a general change and rerun affected development
cases with fresh baseline samples. Assess unchanged cases only against their exact
source fingerprint; test final-candidate coverage explicitly. Reserve fresh
confirmation if any confirmation outcome informs another instruction change.

Test prompts: [editorial-boundaries.json](editorial-boundaries.json). Current campaign
evidence is under `evaluations/natural-writing/editorial-boundaries/` at repository root.
