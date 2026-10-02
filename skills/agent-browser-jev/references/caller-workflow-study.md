> **Historical research evidence.** Agent Browser Jev was archived on October 2, 2026. Results and decisions below belong to their original snapshots; the [final research report](../RESEARCH.md) records the later NO-GO decisions. Installation and automatic campaigns are discontinued.

# Caller workflow study

The September 29, 2026 study found useful delegation, but almost no aggregate cost saving. On six fresh authored positive scenarios, an independent caller using Jev completed all six with correct scope. Jev alone reached five goals and reported four complete. The caller needed to compose one announcement; a separate author task was already complete when Jev handed back control.

## Paired outcomes and caller effort

These are the six completed, isolated positive trials per arm after a provider-parameter repair. The initial caller-only forum start was rejected before inference or browser work; it remains a failed start with zero reconciled charge. Including that start, caller-only reached **6/7 started positive goals**, with **5/7 correct scope**. It is not silently replaced by the successful retry.

| Measure, six completed positive trials | Caller only | Jev only | Caller with Jev |
| --- | ---: | ---: | ---: |
| Final goal reached | 6/6 | 5/6 | 6/6 |
| Goal reached with correct action scope | 5/6 | 5/6 | 6/6 |
| Verified goal/scope and complete report | 5/6 | 4/6 | 6/6 |
| Non-complete final returns | 0/6 | 2/6 | 0/6 |
| Scope failures / contradicted completion claims | 1 / 1 | 0 / 0 | 0 / 0 |
| Caller model decisions | 50 | 0 | 22 |
| Caller browser gestures | 28 | 0 | 4 |
| Helper browser gestures | 0 | 22 | 24 |
| Caller prompt / output tokens | 91,615 / 2,195 | 0 / 0 | 107,813 / 2,097 |
| Caller model cost | $0.129195 | $0 | $0.118684 |
| Jev model cost | $0 | $0.008847 | $0.009920 |
| Total model cost | $0.129195 | $0.008847 | $0.128603 |
| Summed task time | 118.6s | 25.5s | 90.4s |

Delegation used **56% fewer caller decisions** and **86% fewer caller browser gestures**, but more caller prompt tokens. Total cost was effectively equal; task time was about 24% lower in this single sample. Cache usage, provider latency and the small task mix limit those comparisons. Jev-only cost/time covers its unfinished task too, not an equivalent set of completed outcomes.

The separate missing-approved-amount case stopped without inventing an amount or saving an expense in all three arms. Its costs were $0.020589 caller-only, $0.000532 Jev-only and $0.009341 caller-with-Jev. It is not included in positive-task success rates.

## What actually needed the caller

- **Announcement composition:** Jev returned `input_required` after reading the event brief. The independent GPT-5.4 caller composed the missing message, supplied it and resumed the actual token. Jev saved the draft without publishing. This is one real reasoning/input intervention and two helper invocations, not autonomous completion or scripted recovery.
- **Author pages:** Jev correctly favorited all three matching entries across three pages, then returned `handoff`. The caller used four back-navigation gestures to verify the completed result without additional mutations. This is caller acceptance after success, not recovery of an unfinished goal. It cost about $0.060006 with Jev versus $0.030547 directly. The returned recent evidence retained pages two and three, but not the first page's successful effect; preserving compact earlier evidence is a candidate for a later test, not a demonstrated fix.
- **Other positive tasks:** Forum discovery, ranked votes, preferences and preserving an existing note completed in one helper invocation. Initial caller framing and exact values are recorded; the helper still received the original goal, without a caller-supplied end-to-end plan.

Both standalone Jev and the assisted arm's first helper calls reached **5/6** goals, with **4/6** complete reports. Their positive-task return-control rate was **2/6**: one return after success, one unfinished composition. Only the Jev-only arm measures execution without caller framing or acceptance.

## Ranking sensitivity check

The original direct caller reused references while votes reordered the list. It eventually repaired the final selected set, but made an extra vote and undo effects, then claimed the initial three had been downvoted once each. Final state did not erase that scope failure.

The primary caller prompt provided only minimal browser instructions. A predeclared follow-up therefore gave **both caller arms** the standard snapshot → act → snapshot guidance from installed agent-browser 0.38.1. On this already-tested ranking case, both passed with exactly three intended votes. Caller-only used seven decisions and $0.018556; caller-with-Jev used three decisions and $0.015999, with zero caller gestures. This is a two-arm development diagnostic, not a replacement first-attempt score or evidence of general accuracy superiority. The reusable runner now includes that same refresh guidance in both caller arms.

## Design, verification and limits

The helper, revised skill, references, provider settings and source hashes were frozen before the matrix. The caller was `openai/gpt-5.4`, reasoning low, with no model fallback. It had only bounded agent-browser UI tools; the assisted arm also had the skill and its references. It could not read fixture source, hidden expectations or evaluator results. This is an independent **browser-tool caller**, not a full Codex desktop environment. Each task had a fresh conversation and fresh application/browser state. Arm order rotated; all actors shared 30 browser actions and 180 seconds per trial.

The six positives cover top-forum discovery, a ranked set whose scores change, author matching across three pages, preferences, a preserving edit and draft composition. They are **self-authored new instances of practiced workflow types**. They provide no official WebArena reward, unseen-family evidence or production takeover rate. The study tests the whole current workflow, not the causal effect of the recent skill-text revision alone.

Fourteen no-model rendered-control/restoration cycles qualified the primary matrix; two qualified the diagnostic. Independent saved-state and complete persisted-event checks distinguish correct outcomes from wrong or extra effects. The two saved announcements additionally passed a report-hash-bound semantic review by the coding agent against the predeclared rubric; this is labeled supplemental review, not a deterministic meaning check or independent human judgment. Original null semantic verdicts remain in the raw reports.

The first preflight's repeated-name control-selection error and the first paid-start routing rejection remain preserved. Both were repaired and requalified before scoring. Final verification covers 23 scored trials, 16 intermediate helper returns, clean starts, exact frozen sources and explicit resource closure. A later audit found that recorded request objects shared the growing conversation array: historical request entries therefore include later messages. Provider responses, ordered tool transcripts and usage remain intact, but those request entries are not exact sent-request snapshots. The runner now copies requests before sending/recording and has a regression check. Missing cleanup receipts also now fail qualification instead of counting as closed. These reporting repairs did not alter the frozen scored sources or outcomes.

## Cost and evidence

The primary matrix cost **$0.297106** and the diagnostic **$0.034555**: **$0.331661 total**, exactly reconciled against provider key usage after its update lag. Cumulative measured spend is **$7.299797**; conservative accounting is **$24.828372 / $40**, retaining previous reserves and leaving **$15.171628**. No paid work ran beyond the authorized deadline. All owned browser sessions and fixture servers closed; the persistent dashboard remains available.

The working suite passes **360 offline tests**. Pending Agent Browser Jev remains **1.3.0**; no helper runtime change, commit, publication or global installation was made for this study. Private reports, failed starts, frozen sources, semantic review, accounting and verification receipts live in `.runs/caller-workflow-20260929/`. The [capability scorecard](capability-status.md) and [persistent dashboard](http://127.0.0.1:8765/) retain the distinction between autonomous results, assisted completion and reporting friction.

The caller uses OpenRouter's [tool-calling interface](https://openrouter.ai/docs/guides/features/tool-calling). Provider model metadata, pricing and supported parameters are frozen alongside the reports.
