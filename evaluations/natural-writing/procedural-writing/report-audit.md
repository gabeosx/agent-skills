# Procedural-writing report integrity audit

Audited October 23, 2026 by an independent session agent. **Pass within the
persisted-evidence scope; no concrete report discrepancy found.** The audited
`REPORT.md` SHA-256 is
`e3fb608113b4e980598899a29c0527eba8d93b1cebbad83b2cff0223cfcb42db`.

This was a read-only inspection and local arithmetic/hash audit of the experiment
contracts, tasks, actor-input files, frozen sources, first-draft files, blinded
packets, label mappings, reviews, grading records, benchmark files and summaries.
Only this audit was written. No model execution, product runtime access, private
external evidence retrieval or source change was used.

| Check | Result |
| --- | --- |
| Frozen source and task identity | All 16 SHA-256 entries in `experiment.json` and `experiment-2.json` match their files. |
| Current-source coverage | Candidate 2's complete `instructions.md` is byte-identical to the current `skills/natural-writing/SKILL.md`; all four frozen references are byte-identical to their current counterparts. |
| Prior-skill identity | All four old-skill snapshot files are byte-identical to editorial-boundaries candidate 2, the preceding study's final snapshot. |
| Actor input | Each phase's actor-input file is exactly its task file projected to `id`, `name`, `prompt`, and `files`. Development 2 retains the original development inputs. Assertions and expected outputs are absent from these actor-input files. |
| Blinded draft identity | Every one of the 39 stored arm output files matches its mapped A/B/C packet byte-for-byte. Each blinded task equals its phase's task object; each mapping contains all three arms exactly once. |
| Review and grading identity | Each review's assertions match the original assertions. Every grading record matches the mapped review, including scores and defects, and its output hash matches the draft. Benchmark run results and assertions match grading records. |
| First failure retained | Candidate 1 remains 14/15, with one substantive defect on 504: the unsupported preview-based TaskCode-match check. Both baselines remain 15/15. The failed draft, review, grading and candidate-1 source remain present. |
| Development preferences | The first round has four three-way ties and a tie between both baselines on 504. Candidate 2 has five three-way ties and 15/15 assertions per arm, with all dimension means 5/5 and no critical or substantive defects. |
| Confirmation preferences | All three reserved cases are three-way ties; each arm passes 15/15, all dimension means are 5/5, and no critical or substantive defects are recorded. |
| Final arithmetic | Repaired development 15/15 plus confirmation 15/15 gives 30/30 per arm across eight scenarios. The literary-control assertion is included in that total. All six stored development control artifacts preserve the expected passage, with only the standard terminal file newline after it. |
| Copied baselines and trial count | All ten second-round baseline drafts and their `run.json` files are byte-identical to first-round records. The 39 arm output files therefore represent 29 newly generated drafts: 15 + 5 + 9. There are 26 distinct output byte hashes because separate generations can produce identical control prose; the report correctly says newly generated drafts, not 29 distinct text hashes. |
| Unknown metrics | All arm run records retain null tokens, cost and runtime. The report does not convert these unknowns to zero. |

I independently read the supplied task evidence and generated prose. The original
504 invention is correctly diagnosed: row preview availability does not establish
that matching identifiers or collision information can be checked there. Candidate
2 removes that invented check while retaining the overwrite warning. No additional
concrete consequential source-fidelity defect was found in the final outputs or
the baseline outputs. The receiving-cost calculation is correct: 6 kg = 6,000 g,
and $72 / 6,000 g = $0.012 per gram.

The report accurately limits its conclusion. These are controlled, self-authored
fictional tasks with one draft per case and one blind agent review per round.
Fresh contexts are per arm, with cases batched within that actor, rather than fresh
per case. Candidate 2's development result is a repair on practiced cases; the
three reserved cases are separate confirmation evidence. The final all-arm ties
show no measured incremental benefit. There is no human validation, detector
validation, live product verification, causal workflow-effect estimate or known
cost/runtime measurement. Historical genre results remain tied to their historical
snapshots, and the report does not claim those tasks were rerun on current sources.

The files establish internal consistency and frozen byte identity. Dispatch-time
context isolation, original authorship timing and absence of unseen actor feedback
are recorded experiment conditions, not independently reconstructed execution
telemetry. This audit does not promote those conditions into a stronger provenance
guarantee or treat the separate repository documentation application as a causal
skill comparison.

The appended repository-validation section agrees with `validation.json` on its
recorded checks and limits. This audit did not rerun structural validation, release
contract validation, archive discovery or skills CLI installation. Those execution
claims remain supported by that validation record rather than a second execution
here.
