> **Archived trial summary.** This report describes its historical checkpoint, not a supported release or instruction to continue. Local/private links have been replaced with provenance labels. The [final research report](../../RESEARCH.md) records later decisions.

# WebArena isolation repair and trustworthy development result

Persisted-state isolation is repaired and qualified. Every WebArena arm gets a fresh pinned Reddit container with no external mounts; the host verifies backend identity and persisted-state readbacks before dispatch. A lock prevents overlapping use. Missing, dirty or stale qualification blocks paid scoring. The final lifecycle code passed no-model mutation/restoration, dirty-start rejection, and positive/negative evaluator controls.

The helper runtime was preserved. This is an evaluation and reporting improvement, not a claim that Jev's browser reasoning improved.

| Four known Reddit tasks, seed 0 | Saved baseline | Current helper |
| --- | ---: | ---: |
| Full official reward | 2/4 | 2/4 |
| Independently reviewed full goal reached | 2/4 | 2/4 |
| Goal reached with correct action scope | 1/4 | 1/4 |
| Reported complete | 4/4 | 4/4 |
| False completion against the requested goal | 2/4 | 2/4 |
| Scope failures | 3/4 | 3/4 |
| Handoffs / caller interventions | 0 / 0 | 0 / 0 |

The biography change was correct. Both arms upvoted the requested newest post and an unrelated earlier post; subscribed from the listing instead of the required hottest-post page; and replied to an existing comment instead of the post. PostgreSQL actor records, page observations and complete action traces support the supplemental review. Official rewards remain unchanged. This review is scoped to these tasks and is not a universal semantic evaluator.

Eight distinct backend IDs and matching clean-state references were recorded across eight episodes. There were no paired wins or regressions, no retries, no fallback model and no caller rescue. These previously inspected families are development evidence; no unseen-family, full-WebArena or independent caller-LLM claim is supported.

The persistent dashboard (private local dashboard) displays the clean comparison, supplemental review and invalid historical comparisons separately. All 47 older unqualified paired reports remain preserved with their rewards, costs and attempts, excluded from performance claims. New review events bind to exact report hashes and never rewrite raw results. Unknown older delegation metrics remain unknown.

Paid testing took 133 seconds and added **$0.017396694**, within the renewed 20-minute / $0.90 allowance. Cumulative accounting is **$1.019540004 of $2**: $0.559376370 measured plus the existing $0.460163634 reserve. No further paid runs were made after this comparison.

Validation: **170 offline tests**, both skill structural checks, 41 local documentation links, the release contract and whitespace checks passed. The structural validator ran in the existing Docker image because host Python lacks PyYAML; no package was installed. Final lifecycle cleanup hardening was requalified without a model; the paid study keeps its earlier harness snapshot and unchanged helper source hashes.

All campaign-owned site, browser and structural-validator containers and the site network were removed. Existing images and the user's persistent dashboard remain. Substantial pre-existing edits are preserved. Pending versions remain **Agent Browser Jev 1.3.0** and **Benchmark Improvement Loop 1.1.0**. Nothing was committed, published or installed globally.

Next controller experiment: establish target identity, ordering and required containing page before mutation, then test paraphrases, alternate layouts, already-correct state and misleading neighboring controls. Do not promote a prompt change from these four practiced cases without regression evidence or hide increased caller dependence.

Evidence: `paired/reports/`, `paired/scope-audit.json`, `paired/events/`, frozen `paired/snapshots/`, `qualification-release.json`, `negative-release.json`, `positive-release.json`, `validation.json`, `spend.json` and `invalidation.json`. The discarded initialization attempt is retained in `paired-init-error/`; it made no model call. Earlier no-model qualification iterations are retained alongside the final records.

Official setup reference: [WebArena-Verified environments](https://servicenow.github.io/webarena-verified/getting_started/environments/). The pinned `/init` implementation was inspected locally in the preceding reset diagnosis; successful HTTP initialization was never treated as database restoration here.
