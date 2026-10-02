# Research evidence register

This register accompanies the [research report](RESEARCH.md). It inventories **46 pre-archive campaign directories**, **61 public synthetic JSON artifacts**, and **25 curated private-source summaries**. Directory counts are provenance inventory, not counts of independent experiments, paid episodes or successful tasks. Several directories are revisions or infrastructure/proposal checkpoints.

The [machine-readable index](research-evidence.json) records SHA-256 fingerprints for public evidence, historical narratives and preserved source, plus selected private source-summary/protocol/checkpoint files. It does not contain credentials, resume tokens or raw private browser captures.

## Availability and provenance

- Public `references/evidence/` JSON files are the early synthetic evidence already selected for publication. Detailed public study narratives identify the later cohorts, frozen candidates, failures and audit limitations.
- Curated summaries replace private machine/file links with provenance labels. Their corresponding original hashes are in the index. Their costs, service-state statements and pending decisions describe the original trial time; the final report supplies the later archival decision.
- Raw `.runs` records remain private and ignored. Their hashes identify preserved records without asserting public availability. No private trace is linked as if it were a public downloadable artifact.
- The retained working source includes substantial research performed after committed base `136b9a3`. Runtime package version 1.3.0 is historical; archive contract 2.0.0 governs the retirement. Candidate v10/v17/v20 labels are local to each campaign.
- The September 27 integration suite is authored BrowserGym-core evidence. Historical WebArena reset-contaminated results are invalid; later isolation qualification does not retroactively validate them.
- The final archive-preparation folder records this documentation and discovery validation only and is excluded from the experimental campaign count. No new model calls or scored browser tasks were made.
- Publication CI exposed two extensionless mock-browser executables that Node 20.3 interpreted as CommonJS. The two offline tests now name those executables `browser.mjs`; runtime code and scored trial outcomes remain unchanged. The index records the original and published test hashes under `publicationAdjustments`, and the failed CI log remains in the private archive-preparation record.

## Campaign inventory

| Retained private campaign | Public account | Scope |
| --- | --- | --- |
| `action-check-20260928` | [Account](references/archive-trials/action-check-20260928.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `action-review-ablation-20260929` | [Account](references/archive-trials/action-review-ablation-20260929.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `ambiguous-caller-20260930` | [Account](references/archive-trials/ambiguous-caller-20260930.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `bounded-go-nogo-20261001` | [Account](references/archive-trials/bounded-go-nogo.md) | Integrated controller screen: NO-GO; four complete pairs, incomplete six-pair screen. |
| `broad-rc-20261001` | [Account](references/broad-rc-study.md) | Broad development and component experiments; 48 confirmation tasks untouched; candidate scope regression. |
| `caller-workflow-20260929` | [Account](references/archive-trials/caller-workflow-20260929.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `combobox-affordance-20260929` | [Account](references/archive-trials/combobox-affordance-20260929.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `evidence-hypotheses-20260929` | [Account](references/archive-trials/evidence-hypotheses-20260929.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `execution-contract-20260929` | [Account](references/archive-trials/execution-contract-20260929.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `finalization-20260930` | [Account](references/field-binding-study.md) | Destination classifier rejected; reserved regressions and independent picker recovery. |
| `github-project-research-20260929` | [Account](references/published-evidence.md) | Pinned project and official primitive research; not a new benchmark score. |
| `goal-discovery-20260929` | [Account](references/archive-trials/goal-discovery-20260929.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `handoff-history-20260929` | [Account](references/archive-trials/handoff-history-20260929.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `handoff-improvement-20260928` | [Account](references/archive-trials/handoff-improvement-20260928.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `implementation-review-20260930` | [Account](references/implementation-approaches.md) | Cross-version architecture review; not an independently scored actor cohort. |
| `integration-20260927-8h` | [Account](references/study-gym.md) | Original BrowserGym-core integration tasks; authored regression evidence, not public benchmark scores. |
| `integration-20260927-heldout` | [Account](references/study-gym.md) | Original BrowserGym-core integration tasks; authored regression evidence, not public benchmark scores. |
| `integration-20260927-seeded-final` | [Account](references/study-gym.md) | Original BrowserGym-core integration tasks; authored regression evidence, not public benchmark scores. |
| `miniwob-20260927-8h` | [Account](references/study-gym.md) | Early practiced-family MiniWoB campaign/checkpoint; retries and frozen results are separate. |
| `miniwob-20260927-final-rerun` | [Account](references/study-gym.md) | Early practiced-family MiniWoB campaign/checkpoint; retries and frozen results are separate. |
| `miniwob-20260927-final-targeted` | [Account](references/study-gym.md) | Early practiced-family MiniWoB campaign/checkpoint; retries and frozen results are separate. |
| `miniwob-20260927-final-v2` | [Account](references/study-gym.md) | Early practiced-family MiniWoB campaign/checkpoint; retries and frozen results are separate. |
| `miniwob-20260927-focused-fix` | [Account](references/study-gym.md) | Early practiced-family MiniWoB campaign/checkpoint; retries and frozen results are separate. |
| `miniwob-20260927-post-integration` | [Account](references/study-gym.md) | Early practiced-family MiniWoB campaign/checkpoint; retries and frozen results are separate. |
| `miniwob-general-improvement-20260928` | [Account](references/archive-trials/miniwob-general-improvement.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `miniwob-refactor-20260928` | [Account](references/archive-trials/miniwob-refactor.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `object-context-20260929` | [Account](references/archive-trials/object-context-20260929.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `pattern-trials-20261001` | [Account](references/archive-trials/pattern-trials.md) | Hybrid owner/mechanical guard pilot: NO-GO; limited treatment exposure. |
| `pattern-trials-proposal-20261001` | [Account](RESEARCH.md#9-final-bounded-and-architecture-pilots-no-go) | Architecture proposal only; this directory establishes no scored outcome. |
| `picker-commit-20260929` | [Account](references/picker-commit-study.md) | Custom and detached picker development, regressions and held-back discovery variant. |
| `policy-boundaries-20260930` | [Account](references/archive-trials/policy-boundaries-20260930.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `public-transfer-20260930` | [Account](references/public-transfer-study.md) | Shopping Admin transfer, caller derivation, numeric binding and rejected timing candidate. |
| `rc-improvement-20260930` | [Account](references/rc-improvement-study.md) | Multiple frozen RC revisions; final v17 narrow 0/9 to 3/9 standalone gain. |
| `reference-usability-20261001` | [Account](references/archive-trials/reference-usability.md) | Pinned external controller: NO-GO; one negative start, no positive cases. |
| `release-evaluation-20260930` | [Account](references/archive-trials/release-evaluation-20260930.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `requirement-interpreter-20260928` | [Account](references/archive-trials/requirement-interpreter-20260928.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `skill-guidance-20260929` | [Account](references/capability-status.md) | Operating-instruction checkpoint; not a new actor result. |
| `target-scope-improvement-20260928` | [Account](references/archive-trials/target-scope-improvement-20260928.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `value-binding-20260929` | [Account](references/archive-trials/value-binding-20260929.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `webarena-caller-20260929` | [Account](references/archive-trials/webarena-caller-20260929.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `webarena-cost-20260929` | [Account](references/archive-trials/webarena-cost-20260929.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `webarena-isolation-20260928` | [Account](references/archive-trials/webarena-isolation-20260928.md) | Historical checkpoint; later decisions and source attribution are retained in the linked summary. |
| `webarena-verified-20260928` | [Account](references/study-gym.md) | Historical WebArena development; unqualified/reset-contaminated comparisons are invalid. |
| `webarena-verified-20260928-4h10` | [Account](references/study-gym.md) | Historical WebArena development; unqualified/reset-contaminated comparisons are invalid. |
| `webarena-verified-continuation-20260928` | [Account](references/study-gym.md) | Historical WebArena development; unqualified/reset-contaminated comparisons are invalid. |
| `webarena-verified-focused-20260928` | [Account](references/study-gym.md) | Historical WebArena development; unqualified/reset-contaminated comparisons are invalid. |

## Detailed study map

| Topic | Public source |
| --- | --- |
| Architecture feedback, shorter-review test and interrupted continuation | [Study](references/architecture-review.md) |
| Early gyms, travel, Codex and same-stack comparison | [Study](references/benchmarks.md) |
| Broad protocol, component experiments and candidate scope regression | [Study](references/broad-rc-study.md) |
| Campaign records, retry discipline and dashboard distinctions | [Study](references/browsergym-campaign.md) |
| Pinned adapters, public tasks, isolation and receipts | [Study](references/browsergym-study.md) |
| Historical recovery guidance | [Study](references/caller-guide.md) |
| Authored independent-caller comparison | [Study](references/caller-workflow-study.md) |
| Cross-snapshot chronological evidence and known limits | [Study](references/capability-status.md) |
| Component inventory and authored fixture scope | [Study](references/component-gym.md) |
| Readonly display and fill-dispatch repair | [Study](references/control-affordance-study.md) |
| History, membership, arithmetic and target-set ablations | [Study](references/evidence-hypotheses.md) |
| Fixed targets, routing, traversal failures and invalid fixture | [Study](references/execution-contract-experiments.md) |
| Extra destination classifier and finalization | [Study](references/field-binding-study.md) |
| Context/memory variants and independent planning | [Study](references/goal-discovery-experiments.md) |
| Actual exposure, guided evidence and takeover effort | [Study](references/handoff-history-study.md) |
| Historical controller and browser mechanics | [Study](references/helper-behavior.md) |
| Cross-version interpretation and rejected approaches | [Study](references/implementation-approaches.md) |
| Custom/detached selection and rejected discovery variant | [Study](references/picker-commit-study.md) |
| Eligibility, collection identity and action-local picker rejection | [Study](references/policy-boundary-experiments.md) |
| Admin transfer, arithmetic and timing failures | [Study](references/public-transfer-study.md) |
| Pinned projects, primitives and value-binding experiments | [Study](references/published-evidence.md) |
| RC revision history, calendar mechanics and final v17 comparison | [Study](references/rc-improvement-study.md) |
| Frozen 78-pair MiniWoB and public caller budget failures | [Study](references/release-evaluation.md) |
| Initial campaign history, original integration and benchmark qualification | [Study](references/study-gym.md) |
| Historical invocation, returned evidence and continuation | [Study](references/usage.md) |
| Historical experiment qualification and validation practices | [Study](references/validation.md) |
| Public caller matrices, reservations and readonly display follow-up | [Study](references/webarena-caller-study.md) |

## Curated original summaries

| Public summary | Original private source SHA-256 |
| --- | --- |
| [Summary](references/archive-trials/bounded-go-nogo.md) — `bounded-go-nogo.md` | `c3bb665eee90ff006c5714a8598a6af93276f7011089f513719fc5396398ef03` |
| [Summary](references/archive-trials/reference-usability.md) — `reference-usability.md` | `3b8e79f1a2fb56d49376fba0abee1f4d1aeb22c2a65e176eaa9bfffea4d7fd70` |
| [Summary](references/archive-trials/pattern-trials.md) — `pattern-trials.md` | `63665156f886a14d045d660e2bfc142b3e5867890cb9dd837a555d0f4ffb8bbe` |
| [Summary](references/archive-trials/miniwob-refactor.md) — `miniwob-refactor.md` | `bdde7a030abd5dcec5bf0500a3ae34f97685e12b33d14b69d245a39cc8556fe2` |
| [Summary](references/archive-trials/miniwob-general-improvement.md) — `miniwob-general-improvement.md` | `80d9186399e3edd4aedeead1c78ae440595b4a2c9e468b35387fc955724b00c9` |
| [Summary](references/archive-trials/historical-run-review.md) — `historical-run-review.md` | `bd65468adf3928d35e32f88a001e70a545949e557a6e5670f27d03c49df494d2` |
| [Summary](references/archive-trials/action-check-20260928.md) — `action-check-20260928.md` | `bbbd30a870021052e6d8d27261aec100700c269d69ac1bbfb31913764b40c055` |
| [Summary](references/archive-trials/action-review-ablation-20260929.md) — `action-review-ablation-20260929.md` | `e0a1ab25fd80c000b849222a5749fbdf0dc9b0bfc4d66f324b2c868217f3c6a5` |
| [Summary](references/archive-trials/ambiguous-caller-20260930.md) — `ambiguous-caller-20260930.md` | `31e796f5a8c395a659ffd8f5cbb8aa3f380e5957bbd48fb309a0e67f15824c39` |
| [Summary](references/archive-trials/caller-workflow-20260929.md) — `caller-workflow-20260929.md` | `14a510a26944306364add5f03b04d10b35853a20bc16675b9166bd18ecf7f698` |
| [Summary](references/archive-trials/combobox-affordance-20260929.md) — `combobox-affordance-20260929.md` | `dcd6d21bbd319671055332ba72647b50b462863fe92eaafe32099b1d0befc4dd` |
| [Summary](references/archive-trials/evidence-hypotheses-20260929.md) — `evidence-hypotheses-20260929.md` | `3ce4f299a7b870e2bf01bdea8dd6dbbac44ec4c1cd70864656d567e9456aef33` |
| [Summary](references/archive-trials/execution-contract-20260929.md) — `execution-contract-20260929.md` | `387d72de362d6cd33c818a14f30c9db1a245c0313cb267c7d841057dc76301f8` |
| [Summary](references/archive-trials/goal-discovery-20260929.md) — `goal-discovery-20260929.md` | `fa917494a430819a5a887b74d2c7fa2460a788fcbb08ed0da61d02b7c31c4ace` |
| [Summary](references/archive-trials/handoff-history-20260929.md) — `handoff-history-20260929.md` | `d5c020a38680f0b02326585c2073ed95a3bc9f4677b11c8ec5329a5163bd5555` |
| [Summary](references/archive-trials/handoff-improvement-20260928.md) — `handoff-improvement-20260928.md` | `2405ab77cf30c3aaf4f04b9b3514c1202a8dc3be8e89fc0e282fbe936fa1122a` |
| [Summary](references/archive-trials/object-context-20260929.md) — `object-context-20260929.md` | `adbd97f276885c8dd3f980856eede3bb33d18327f5213ef0b7e04ad110531b96` |
| [Summary](references/archive-trials/policy-boundaries-20260930.md) — `policy-boundaries-20260930.md` | `3cac50140997a18e8f7de6c1e950967a89ea7d6873dbb04dc5bc5d4eb07a144e` |
| [Summary](references/archive-trials/release-evaluation-20260930.md) — `release-evaluation-20260930.md` | `7e96bc95c7ddb9c8f9aef57c65a2a229e35b853a70ea25ee99551b136ce9518e` |
| [Summary](references/archive-trials/requirement-interpreter-20260928.md) — `requirement-interpreter-20260928.md` | `8e7945ae424b08aefe8ad70f58a62aa34256e64d53615b22be57ab16923a1b5e` |
| [Summary](references/archive-trials/target-scope-improvement-20260928.md) — `target-scope-improvement-20260928.md` | `afe55c203d9a09c4165561c1c189450f11d055aaca0023d15ca7d81daae576f8` |
| [Summary](references/archive-trials/value-binding-20260929.md) — `value-binding-20260929.md` | `b810895c8f219a9cf9ad31d4adf2e9f115d44be4bbd1dc9360cd7596fd65f236` |
| [Summary](references/archive-trials/webarena-caller-20260929.md) — `webarena-caller-20260929.md` | `fa839e1bfb4d33902b9f40c250b0f6406a7bd6f01573d88e03d286a7bfe89399` |
| [Summary](references/archive-trials/webarena-cost-20260929.md) — `webarena-cost-20260929.md` | `9daf185d7b53ae615ba7b6cfdb1365b223033bc2bb76ad61529d750c771f5174` |
| [Summary](references/archive-trials/webarena-isolation-20260928.md) — `webarena-isolation-20260928.md` | `aebcc428ed8e639c4f761ae80a58d673bcb7d2d567b252cf9c71f8e9707be9b6` |

## Public synthetic artifacts

All public JSON paths and hashes are enumerated in [research-evidence.json](research-evidence.json). The [benchmark notes](references/benchmarks.md) link the outcome reports for gyms, components, wrong keyboard selections, generated travel, caller comparisons and repeated competitor checks. Adjacent `.details` reports remain part of the published early fixture evidence.

## Interpretation rules

Keep official reward, exact goal, transient/persisted scope, reporting, caller assistance and unavailable outcomes separate. Do not sum safe negatives into positive completions, turn a rescued goal into autonomy, combine the best rows across sources, treat incomplete pairs as a finished matrix, or sum overlapping spending checkpoints. The 48-task broad confirmation cohort was never run. The integrated screen, external reference usability trial and actual pattern pilot were NO-GO.
