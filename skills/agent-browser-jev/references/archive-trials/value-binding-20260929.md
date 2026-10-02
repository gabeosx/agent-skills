> **Archived trial summary.** This report describes its historical checkpoint, not a supported release or instruction to continue. Local/private links have been replaced with provenance labels. The [final research report](../../RESEARCH.md) records later decisions.

# Value binding and Jev usage patterns — 2026-09-29

The retained runtime is `candidate-v10-eager`, with the flat main action selector. Working runtime fingerprint: `eb506146b1328296df4fd894407474a05bcf672ef93a141e441228adede4a99b`. Runtime files match the frozen tested snapshot; documentation and one dashboard metric regression were finalized afterward. Pending releases remain Agent Browser Jev 1.3.0 and Benchmark Improvement Loop 1.1.0. Nothing was committed, published or installed globally.

## What changed

- Exact source binding lets Jev identify a current plaintext source field or contiguous caller-goal span. Code preserves exact text, excludes masked/hidden/unobserved sources, validates source freshness and offers an ordinary authorized fill.
- Empty destinations without a fill receive proactive binding questions. Independent destinations share one request; a single field keeps focused state. Dependent excerpt choices remain sequential. Unknown answers keep the caller boundary. All bindings expire with changed observations.
- A readable destination that rejects or transforms the exact input returns `input_not_accepted` before a later commit. This catches an unrepresentable multiline-to-single-line copy without claiming that task passed.
- Readonly textboxes can be clicked to expose supported pickers. Link-role controls without href use pointer activation: a no-model reproduction proved focus/Enter could instead activate the previously focused date field. Href links retain the wrapped-text keyboard workaround.
- Development traces retain numeric decision distributions and request sizes. An optional operation/target experiment remains available only as a library test configuration; the default remains flat.
- Dashboard reporting separates return after full reward from return after independently reviewed goal, and completion without full reward from independently contradicted completion.

## Official-source lessons and rejected designs

Reviewed official TypeSafe primitives, model jaggedness, confidence, state, fan-out, extraction cookbooks and official skill; also Browser Use's controller at `1231850a0bf1a0c0341fe408ef1668dbbfdfac46` and forvela at `b4d4e0284a4b0336f12831ef6fe64ba5d29b1efb`. Sources/hashes are in `research/sources.json`; the public-facing synthesis is `references/published-evidence.md`.

Choice is valid for bounded next actions, extraction and routing. Noul provides yes probability, Score provides a graded judgment. They do not independently establish scope or completion. Independent questions can share evidence and a request; real dependencies need a later request. Question IDs do not replace instructions. Code should own arithmetic, exact copying and mechanical freshness. Candidate coverage and preserving relationships matter more than maximizing the number of classifiers. Optional generative text helpers introduce assisted model usage, which must be measured separately.

A shortened operation/target variant achieved only 4/7 local positive goals and falsely completed three tasks. A semantics-preserving version recovered 6/7 but cost about 65% more than flat selection, with no local autonomy gain. The later Reddit comparison reached 1/7 versus 2/7 for flat selection. This design was rejected.

An initial proactive-binding variant with shared state even for one field lost a local last-word goal. Restoring focused single-field state recovered the goal. The retained v10 local comparison preserved 6/7 positive goals plus 3/3 negatives, with 64 versus 78 calls and $0.006060642 versus $0.007669242. These are self-authored development fixtures, not general reliability evidence.

## Frozen external comparisons

### MiniWoB

- Preceding v8 versus v20, seed4093 across39 practiced families: full reward28/39 versus25/39; full reward plus completion report26 versus23. One candidate false completion by reward, two baseline; both returned after two rewarded goals. Scope audited only for five targeted families.
- Retained v10 versus v8, seed5093 across the same39 practiced families: full reward29/39 versus28/39; full reward plus completion report28 versus27. No completion on zero-reward tasks. Both returned `no_progress` after rewarded inbox deletion. Calls314 versus313; costs$0.039045594 versus$0.03783297; total helper time97.7 versus104.7seconds. No caller intervention.
- The only v10 outcome difference was last-word extraction. A separate copy/paste replay succeeded in both changed and unchanged arms, limiting causal claims from that replay.
- Final supplemental scope review covers four families: exact-copy, date and last-word effects were correct; both flight-booking arms searched prematurely without committing autocomplete choices. The other35 families retain unassessed additional scope. Official reward is unchanged.
- All39 families were practiced. No full-benchmark, unseen-family or statistical reliability claim applies. No source changes were made in response to the final39-family outcomes.

### WebArena-Verified

The fresh seven-instance design comparison used583,633,638,717,722,729,734, selected from metadata before inspecting goals. Calibration399 passed both arms and is excluded. This compares frozen v5 flat versus v7 factored, not current v10.

Flat/factored: full reward2/7 versus1/7; independently verified full goal and scope2 versus1; completion reports5 versus4; independently contradicted completions2 each; scope failures1 each; unresolved forum suitability1 each; non-complete returns2 versus3; caller interventions0.

Both incorrectly used a description as a forum title and falsely completed. Both treated empty keyword results as completed author-scoped voting; independent restored database readback found matching unvoted posts. Both posted exact product-request content into AskReddit with official reward0.5; the appropriate-forum judgment and evaluator rejection cause remain unestablished. The flat arm edited the correct Ted Lasso post; the factored arm handed back without a gesture.

Actual harness `b0f753898a13fda2c6037ed73ea32e6db2681e5660f6cd995826ecd30938939c` passed bidirectional mutation/restoration, dirty-start rejection and negative/positive evaluator controls. Every scored arm had fresh verified database state and distinct backend identity. Historical /init-contaminated reports remain invalid. No evaluator answer was supplied to Jev.

## Validation, provenance and cleanup

- Final working offline suite:300/300. Frozen runtime suite:299/299 before the additional dashboard reporting test.
- Final live components:27/27 positive goals and completion reports, plus one expected absent-target handoff. Self-authored coverage.
- Both structural validators passed using the existing benchmark image, with no network or package installation. Release contract relative to HEAD,53 changed local links and `git diff --check` passed.
- `evidence-verification-final.json`:7 event chains,208 events,97 paired reports,14 snapshots,7 scope audits,4361 arm source hashes. Working helper matches v10; qualified harness unchanged.
- `local-verification-final.json`:7 selected local reports,241 source hashes,88 independently recomputed exact-effect checks, verified fixture cleanup and reconciled provider usage.
- Full record contains initial exact-copy verifier false alarms corrected by a hash-bound audit, the original unsafe normalized-copy behavior, rejected controller designs, the aborted no-model diagnostic, unsuccessful booking/date development and all later repaired evidence.
- Campaign-owned backend/network removed after a pristine readback; all trial and validator containers and local browser sessions closed. Existing images and unrelated hermes containers retained. Dashboard remains live at the private local dashboard and shows final29/39 versus28/39 with failures and scope gaps.

## Budget and continuation

Explicit authorization: four hours, up to remaining$18.26 under cumulative$40. Conservative window:12:32:20–16:32:20UTC. All paid work finished13:46:27.639UTC.

New measured cost:$0.443878134; provider key-usage delta reconciles exactly to floating-point tolerance. Cumulative measured:$4.649934996. Cumulative conservative accounting:$22.178510046, including all prior reserves. Approximately$17.82 remains under the cap. No pending unknown charges. Accounting is not a claim that conservative reserves were billed.

The current wall is broad planning, author/collection discovery, scope and completion reliability. The current runtime has no fresh WebArena score and no independent caller-LLM recovery evaluation. A future meaningful experiment should change planning/context selection or explicitly measure a stronger caller's recovery on frozen failures. Repeating the same-model veto chain or unchanged failures is not justified by this evidence. Preserve caller tokens, cost, time and interventions separately if testing that assisted arm.

Global retries for book-flight/3071 and choose-date/3071 are exhausted: do not launch another paid retry. Fresh seeds remain practiced-family evidence. Reuse the existing deadline only while it is still valid; obtain renewed time authorization after it expires. Keep all earlier reserves, source snapshots and failure records. No work is scheduled after this checkpoint.
