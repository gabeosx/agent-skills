> **Archived trial summary.** This historical report is published for research, not installation or continued execution. Private file links have been replaced with provenance labels; statements about working-tree or service state describe the original trial checkpoint. See the [final research report](../../RESEARCH.md).

# Historical run comparison reviewed 2026-09-28

This read-only evidence review corrects the assumption that the last selected baseline was the strongest earlier result. No paid model calls or runtime edits were made. Times below are America/New_York (EDT); version labels are local experiment snapshots, not released skill versions.

| Eight-task practiced WebArena run | Started | Official full rewards | Verified goals | Goals with correct action scope | Confirmed false completion | Scope failures | Unassessed goals |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| target-scope-improvement-20260928/webarena-v6-qualified | 5:41 p.m. | 6/8 | 7/8 | 6/8 | 0 | 1 | 1 |
| target-scope-improvement-20260928/webarena-v7 | 5:46 p.m. | 5/8 | 6/8 | 6/8 | 0 | 0 | 1 |
| target-scope-improvement-20260928/webarena-v9 | 5:54 p.m. | 5/8 | 6/8 | 6/8 | 1 | 1 | 1 |
| requirement-interpreter-20260928/webarena-v7 | 6:50 p.m. | 4/8 | 5/8 | 5/8 | 1 | 2 | 1 |

All four rows have verified per-arm backend isolation. The earlier reset-contaminated WebArena runs are not comparable. Scope checks supplement the unchanged official reward; they do not replace it. The scope-audited report hashes for the older v6 and v7 runs were checked against their events during this review.

The older v6 completed both required-source subscription tasks correctly. Its upvote task also voted on a second, unrequested post: the goal was achieved, but action scope failed despite full official reward. The exact console question was independently correct but received 0.5 official reward; the broad question remained unassessed. It reported completion for all eight. This is the highest official score found among the qualified eight-task runs, not proof of highest general reliability.

The older v7 also completed both source-page subscription tasks, avoided the extra vote and had no confirmed false completions. It requested input on the NYC question rather than completing it. These are distinct tradeoffs; it should remain a comparison baseline alongside v6.

The older v6 also scored 42/42 MiniWoB goals with 40 completion reports on its fresh practiced-family seeds and passed all 28 component checks (27 goals plus one expected negative). However, it failed two of four targeted known-regression checks: use-autocomplete/1015 falsely reported completion without reward, and click-tab-2/1013 handed off without reward. Its progress suite passed 7/8 checks. The older v7 scored 41/42 on its full MiniWoB matrix and 3/4 on the targeted regression set. Neither snapshot was uniformly strongest.

For completion reporting, requirement-interpreter candidate-v2 at 6:30 p.m. reached 42/42 MiniWoB goals and returned completion 42/42. The September 27 final-v2 and post-integration runs each reached 42/42 with 41 completion reports. These used different seeds from later runs and cannot establish a causal ranking.

Runtime diff findings:

- Target-scope v6 to v7 changed only scripts/agent-browser-jev.mjs: it added the prepared-form completion reviewer and its state handling.
- Target-scope v7 to v9 changed only one selector instruction string. Detailed guidance about parent versus child targets, sidebar actions, external title links versus discussion pages, and choosing an existing form was replaced by shorter generic target/source guidance.
- The subsequent requirement-interpreter redesign inherited that shorter v9 selector. Thus comparing only against v9 overlooked useful earlier navigation/targeting guidance. This is a concrete ablation candidate, not proof that the prompt change caused all observed differences.

Next comparisons should retain older v6 and v7 as controls and isolate these specific changes on matched task states. Do not combine the best outcomes from different snapshots into a fictional aggregate success rate. Keep goal achievement, scope, reporting and caller dependence separate, and preserve the known regressions.
