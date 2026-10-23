# Independent repository README coverage review

Reviewed October 23, 2026 by a separate reviewer from the README drafter. This is a source and implementation coverage review, not a human preference study or a live runtime qualification.

## Scope and method

Compared the four frozen originals under `source/` with `README.md`, `skills/apple-container-skill/README.md`, `skills/macwhisper/README.md`, and `skills/agent-browser-jev/README.md`. Applied `skills/natural-writing/SKILL.md`, its procedural-writing and editorial-judgment references, and the Documentation skill. Checked the relevant current skill entrypoints, MacWhisper's script, libraries and `.env.example`, Jev's `ARCHIVE.json`, research and evidence register, and the existing release history. Checked the root catalog summaries against their skill entrypoints.

No private transcripts were read, no MacWhisper database commands were run, and no container or browser runtime was started. A database-free call to the exported transcript formatter used synthetic lines to verify the filtering boundary. External CLI requirements and installation behavior were not independently fetched in this pass; their primary-source verification belongs to the installation review.

The initial reviewed README SHA-256 values were:

| File | SHA-256 |
| --- | --- |
| `README.md` | `3a530d66dd557e8ab50c0af4bad74cd20592af3abdad749fc363af9fda50bbc0` |
| `skills/apple-container-skill/README.md` | `da77b09aaed9ddf275599da3a9908db1324442f292391851e5c7bdceb10b61b6` |
| `skills/macwhisper/README.md` | `9498d412cf8128edf767bdeef2d1b2f74c189c918c7e73c504fdc1556530a92a` |
| `skills/agent-browser-jev/README.md` | `bb84bc75d33338fe20f5d4bb2d4caf5a262b0604d4b9e618fbc20e0ec5ad8156` |

Line numbers below refer to those initial drafts. Changes after review need a targeted recheck.

## Actionable findings

### P2: MacWhisper search fallback is unsupported

**Location:** `skills/macwhisper/README.md:31`.

The README says search falls back to title search when a full-text index is unavailable. `skills/macwhisper/lib/db.js:98-125` always issues a single query using `LIKE` against `userChosenTitle`, `aiTitle`, and `fullText`; there is no FTS-index query or fallback branch. `sqliteJson` throws on a query error at lines 19-21, which becomes `OPERATION_FAILED` in `macwhisper.js`. The README creates a recovery guarantee readers cannot rely on.

Describe keyword matching across titles and stored transcript text without promising a fallback. The same inaccurate fallback statement is present in `skills/macwhisper/SKILL.md`; reconcile that reference with the code as part of the factual correction. The original README did not promise this fallback, so this is a newly introduced claim sourced from an inaccurate instruction rather than an implementation-backed addition.

### P2: The diagnostic helper is not read-only

**Location:** `skills/apple-container-skill/README.md:21`.

The helper is labeled read-only, but `scripts/diagnose.sh:109-119` runs `container run --rm docker.io/library/alpine:latest` and performs DNS and ping requests. It can pull and retain an image and starts an ephemeral container. The `--rm` container cleanup does not make the helper read-only.

Replace the label with an accurate description such as diagnostics plus an ephemeral network smoke test, and mention that the image may be pulled. This wording was inherited from the original README, but the current implementation does not support it. No runtime test is needed to establish the mismatch.

### P2: Transcript filtering omits a consequential content-loss boundary

**Location:** `skills/macwhisper/README.md:52`.

The paragraph describes removal of hallucination patterns, including non-Latin confabulation and Icelandic/Nordic fragments. `lib/format.js:34-52` actually removes any entire line containing a character outside U+0000 through U+024F, plus lines matching the all-caps expression. It does not distinguish hallucinated content from real speech, and has no separate Icelandic/Nordic detector. The accuracy caveat warns about surviving text but does not tell readers that legitimate text can be lost.

The exported formatter, called with synthetic lines and no database access, produced:

| Synthetic line | Returned? |
| --- | --- |
| `We agreed to meet.` | Yes |
| `We agreed—tomorrow.` | No |
| `日本語の発言です。` | No |
| `Þetta er íslenska.` | Yes |
| `APPROVED` | No |

Describe the actual whole-line character and all-caps filters and warn that legitimate non-Latin content and punctuation can be removed. Remove the unsupported implication of dedicated Nordic filtering. The original README already overstated filter selectivity; the rewrite appropriately removes its assurance that note generation is unpolluted, but needs this further factual correction.

### P2: The catalog's comparison-study link has no target yet

**Location:** `README.md:37`.

The link to `evaluations/natural-writing/procedural-writing/REPORT.md` was absent when reviewed (`test -f` failed). Add the intended report before completion or link to an existing study. This may be an in-progress artifact dependency rather than a final defect; recheck it with the final tree.

## Consequential coverage retained

| Document | Coverage assessment |
| --- | --- |
| Root README | Retains the seven active skill choices, supported scope, independent versions, SemVer categories, changelog and validator requirements, committed tagging, archive-manifest contract and continued availability of historical Jev copies. Installation is easier to find. The local symlink example quotes the source path and names a replaceable destination. The CLI and runtime dependencies are distinguished. |
| Apple Container README | Retains the runtime shapes, version-aware guidance, host integration, registries, socket direction, intentional environment inheritance, kernel controls, scoped cleanup, configuration path and experimental Kubernetes. New Apple silicon/macOS 26+ prerequisites match `SKILL.md`. Linked guides carry operational details rather than forcing every recovery onto the setup path. The helper's read-only label needs correction above. |
| MacWhisper README | Retains list/fetch/search/status/mark-processed, JSON output, UTC calendar matching, separate notes-tool responsibility, optional metadata, no npm dependencies, standard-path defaults and local uncommitted state. Correctly resolves the original contradiction between running from the skill directory and claiming state is always in the project root. Optional `.env` overrides are conditional, not universal setup. Marking processed occurs after saving the note. Search and filtering need correction above. |
| Jev archive README | Preserves October 2 retirement, failed and incomplete studies, caller costs/recovery, private evidence boundaries, final NO-GO outcomes and the unrun 48-task confirmation cohort. Preserves archive contract 2.0.0 versus historical runtime 1.3.0, candidate-snapshot limits, lack of a public entrypoint and lack of turnkey support. `ARCHIVE.json`, `RESEARCH.md`, `EVIDENCE.md` and the 2.0.0 changelog entry agree. |

The Apple validation-history paragraph and all ten observation bullets are unchanged in substance from the frozen original. They distinguish the 1.1.0 skill's live 1.2.0 runtime checks, the 1.2.0 skill's staged 1.4.1 review without replacing the host runtime, and the 1.3.0 skill's live 1.5.0 checks. The changelog corroborates these distinctions. The older Alpine and CLI-help observations remain explicitly historical; they must not be promoted to limitations of the currently installed runtime.

The Jev rewrite removes a now-explanatory account of how entrypoint removal works and the original publication-timing sentence. The archive already exists in committed history (`7ebbafb`), and the draft still preserves the availability boundary for existing installations, commits, tags and forks. This omission does not erase a present installation prerequisite or justify claiming that historical copies disappeared.

## Optional prose refinements

No additional prose-only change is needed for coverage. The Apple validation history is long, but it is clearly labeled and preserves evidence the original deliberately exposed; shortening it is optional and must retain the source/runtime distinctions. The four drafts generally use direct descriptions, navigable headings and task-relevant lists without adding an editorial self-review to the public copy.

## Initial verdict

The rewrites preserve the consequential source coverage and improve setup sequencing. Resolve the implementation mismatches and pending link above, then recheck only affected passages and link targets. This review does not establish live service behavior, successful installation, human preference, or a causal improvement from Natural Writing alone.

## Targeted recheck after corrections

The drafter corrected the three implementation-backed findings. I reread the changed passages against the same code; no runtime code changes were requested or needed.

| Initial finding | Recheck result |
| --- | --- |
| Unsupported search fallback | Resolved. `skills/macwhisper/README.md:31` now describes SQL substring matching over titles and stored transcript text. `skills/macwhisper/SKILL.md:143` explicitly states that no FTS index is used. Both agree with `searchSessions`. |
| Read-only diagnostic claim | Resolved. `skills/apple-container-skill/README.md:21` now states that the helper can pull/run Alpine and make DNS/ping requests, so its effects are visible before use. |
| Filtering content loss | Resolved. `skills/macwhisper/README.md:52` now names the U+0000–U+024F whole-line boundary, warns of legitimate non-Latin speech and English punctuation loss, and directs completeness/accuracy checks to the original recording or MacWhisper transcript. The unsupported Nordic-detector implication is gone. |
| Comparison-study link | Pending the drafter's planned report before final completion; this reviewer has not yet confirmed the target exists. |

Rechecked SHA-256 values:

| File | SHA-256 |
| --- | --- |
| `skills/apple-container-skill/README.md` | `4c057f39ef221b817762bf5e81bce3f113e4b5115faa67423ee810b58b95d660` |
| `skills/macwhisper/README.md` | `a49acefdcc69d446b8a777f43ffed9ed56ec86e803f4b14ff1a965eb5523d4ae` |
| `skills/macwhisper/SKILL.md` | `ac2fa7c2d6fda99d8c38cc5e4d683c68bfcfee0f79b6768795e510e2e2345a38` |

All three consequential prose/code mismatches are closed at these fingerprints. The final tree still needs the planned comparison report and the ordinary release/link validation handled by the main task. Initial findings remain above as the review record.

## Final targeted recheck: archive contract and report link

The root README's comparison-study link now resolves to the existing `evaluations/natural-writing/procedural-writing/REPORT.md`. Its title and introduction identify the procedural-writing follow-up and link the earlier style and editorial-boundary studies, so the catalog's comparison-study description has an appropriate target. The initially pending link finding is closed. This narrow recheck does not independently rescore that study.

`skills/agent-browser-jev/README.md:23` now distinguishes the preserved executable research version 1.3.0, the initial incompatible retirement 2.0.0, and current archive contract 2.0.1. `ARCHIVE.json` agrees: `metadata.version` is 2.0.1, `preservedRuntimeVersion` remains 1.3.0, the status remains archived, and the retirement date and retained research paths are unchanged. The new `CHANGELOG.md:80` heading records the 2.0.1 documentation clarification; the original October 2 2.0.0 retirement entry remains intact. These changes do not reinterpret historical candidate labels, promise a supported runtime, or recreate an installer entrypoint.

No new actionable issue was found in the requested archive passage, manifest, changelog entry, or root comparison-study target. This supplement supersedes earlier present-tense references to 2.0.0 as the current archive contract without rewriting the initial review record.

Final targeted SHA-256 values:

| File | SHA-256 |
| --- | --- |
| `README.md` | `3a530d66dd557e8ab50c0af4bad74cd20592af3abdad749fc363af9fda50bbc0` |
| `skills/agent-browser-jev/README.md` | `50544fcb7d197f1ee3cb56fcb756022914f652ed14e38a194766c2a5fba9ebf2` |
| `skills/agent-browser-jev/ARCHIVE.json` | `73ac2d4599d8cdc6fc3c1230edcc7749add43b90d19b4507794ca04dbd87b11b` |
| `CHANGELOG.md` | `86bfbd009de8b38e9ef858bc2a7402a57cae7bf50c23ed5a503459f23bb9f4aa` |
| `evaluations/natural-writing/procedural-writing/REPORT.md` | `9052e00c15554a2db2e6cf2624e711ef61dbd43002212b932c11d0271db7ef6d` |
