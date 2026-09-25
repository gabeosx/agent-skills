# What published Jev browser results support

Reviewed 2026-09-25. These are authors' published measurements, not runs reproduced by this project. The comparison is about the complete setup and measurement boundary, not just the model name.

## The four starting articles

| Source | What it establishes | Lesson for this helper |
| --- | --- | --- |
| [JevList: jev-agent-browser](https://jevlist.ai/projects/jev-agent-browser), with [upstream source](https://github.com/mhingston/jev-agent-browser) | A closely related agent-browser sidecar exists. The listing reviewed source and offline tests; it did not run a live browser benchmark. Upstream's performance example measures smaller serialized context, not demonstrated whole-task speed or accuracy gains. | Reuse agent-browser and dynamic observed controls. A package listing is architectural evidence, not another measured speed win. |
| [rtrvr: browser-agent benchmark](https://rtrvr.ai/blog/jev-browser-agent-benchmark) | Two tasks finished 31% and 43% sooner, with estimated inference cost 38% and 51% higher. Each configuration ran once per task. A larger model planned; Jev chose actions. Extra context-scoring calls outweighed savings against cheap cached GLM input. | Keep the larger model outside the click loop. Don't add a scoring pass to every observation. Count all calls and cached input, not just Jev's price. |
| [Latenode: Jev Ultrafast](https://latenode.com/ai-trends/jev-ultrafast-browser-agent) | A description of Browser Use's implementation, not an independent Latenode benchmark. It points to the upstream runtime comparison below. | Trace headlines to the underlying measurements; don't count this as a second independent result. |
| [Browserbase: What is Jev?](https://www.browserbase.com/blog/what-is-jev) | Early Stagehand `act` median latency fell from 1.97s to 0.46s, about 4.3×. That measures an action primitive, not a complete Codex task. The integration retains LLM fallback. | Jev is a good candidate for control selection. The result does not promise a 4.3× reduction in navigation, caller reasoning and final verification together. |

## Additional primary evidence

[Browser Use's performance report](https://github.com/browser-use/jev-ultrafast/blob/main/docs/performance.md) compares two runtimes using the same Jev and text model. Three paired flight-search runs all passed. Median time fell from 9.450s to 7.092s; browser protocol calls fell from 1,092 to 101. The improvement came from cheaper observation and fewer unnecessary invalidations. Initial navigation and independent final verification are excluded. This is evidence that browser overhead matters, not a Jev-versus-GPT comparison. Their single-request operation/target selection also avoids serial model calls for decisions that share an observation.

[WindTunnel's published benchmark](https://github.com/nekuda-ai/WindTunnel) reports Jev + Mercury completing 141/147 attempts with WebMCP tools, versus 76/147 with its DOM-control setup. The corresponding task-solve counts are 49/49 and 25/49, so “49/49” is not perfect attempt reliability. Median times are 3.2s and 5.4s. These are different complete harnesses: the result supports investigating better action interfaces, but does not isolate the interface as the only cause. Website-provided semantic tools are useful when available; writing a bespoke site automation layer to imitate them would change this project's purpose.

[TypeSafe's launch report](https://typesafe.ai/blog/introducing-system-one-models-and-jev) attributes its largest published multiples to structured workflow evaluations. Its browser-like Wikiracing demonstration has smaller gains. Typed output prevents invented output structure; a valid choice can still be the wrong action. The vendor's examples do not establish arbitrary-site success rates for this helper.

## Implementation decision

Keep the current division: the caller owns intent and generated text, Jev chooses among observed controls, and agent-browser executes. Our loop already makes one Jev choice per observation, reuses the post-action snapshot, and includes wait/completion/handoff in that choice. There is no need to add separate action-classification, confidence, or completion model calls by default.

Fix caller handoff handling and preserve observations. A correct stop should be described as a correct stop; the requested browser outcome may still be unavailable. Keep helper results separate from subsequent caller recovery.

Measure whole-task time alongside helper-loop time, decision time, GPT usage and Jev charges. The difference between whole-task time and helper-loop time includes navigation, process startup, orchestration and final readback; it must not all be labeled “GPT thinking.” Do not remove outcome checks just to improve the timing.

Use direct agent-browser commands when the exact action is already known. Delegate a coherent short task when repeated page interpretation is needed. Generated text remains caller-supplied; an additional writer model is not needed for that case.

Defer new provider adapters, confidence thresholds, context scoring and browser-engine replacements until measured failures justify them. Native select, scrolling and keyboard widgets remain gaps in the helper's action vocabulary; the caller can use ordinary agent-browser for them. More coverage could reduce handoffs, but the articles do not prove that adding it would improve our tested tasks.


The 0.2.1 replay also exposed avoidable caller work: Jev saved preferences, then the caller reopened the dialog to verify the checkbox. Those strict failures remain recorded. The next proposed optimization is to expose the final observation directly in the CLI summary and let the caller verify that evidence before requesting another snapshot or interacting again. That proposal is not implemented in this patch; it needs a focused comparison because visible evidence can be stale after an uncertain action or external activity. It requires no website-specific parser or additional model.

## Additional open-source implementations inspected for v0.3.0

Source review on 2026-09-25; these projects were inspected, not installed or live-benchmarked by this project. Public demos, historical prototypes and independent comparisons are different kinds of evidence.

| Project / inspected commit | Observed implementation | What v0.3.0 takes from it |
| --- | --- | --- |
| [forvela/jev-agent-browser](https://github.com/forvela/jev-agent-browser/tree/b4d4e0284a4b0336f12831ef6fe64ba5d29b1efb) | Continuous agent-browser loop, broader controls, parent-supplied values and structured final observations/history. Its 17-second walkthrough is not a controlled comparison. | Broader ordinary controls and useful result delivery. No new browser engine. |
| [jal-co/jev-agent-browser](https://github.com/jal-co/jev-agent-browser/tree/db88ece0513e9f43d495f3562d06dfbcbbbc9543) | `run_until_input` pauses for text and continues the same goal. A persistent JSON-lines server holds tasks. | Continue a task after a missing value. Our private continuation file avoids requiring another server. |
| [wy-coliney/jev-browser-use](https://github.com/wy-coliney/jev-browser-use/tree/cf7e76607d4ec70592b24becadd0296dcda8177a) | Runs within Codex's browser connection, retains history across handoffs and returns final page state. Approximate 5–10× browser-operation claims are workflow experience, not a published controlled suite. | Keep the caller out of the action loop and return the page directly. We retain agent-browser and its authentication rather than adopting a Codex-only driver. |
| [jkudish/jev-browser](https://github.com/jkudish/jev-browser/tree/7e603af03d26940fc0bc3a5ca0b227abee73c1de) | A CLI/MCP/library loop bundles action, done and stuck judgments in one request. Optional text generation and browser content extraction. | Compact evidence and bounded execution. Extra judgments/text models are not needed to address our measured caller overhead. |
| [laihenyi/pi-Jev-browser](https://github.com/laihenyi/pi-Jev-browser/tree/206a351831d82580a78ac4635aabcc33bc7134c9) | Browser/desktop loop with operation+target choices, exact-text selection and optional generation. Published live measurements include a 10-action loop around 8.25 seconds, without a matched GPT baseline. | Evaluate sustained execution and report the actual measurement boundary. We keep text composition with the caller. |
| [jasonduncan/jev-browser](https://github.com/jasonduncan/jev-browser/tree/e8649083fad5c34e8a4178cbae19fde420e010ec) | Parent-authored steps require a verification callback for each step. Historical speed comparisons explicitly predate its packaged release. | Timing decomposition is useful; requiring per-step website verification code would undermine this skill's general-purpose goal interface. |

The new capabilities use the same thin architecture: caller goal → observed controls → Jev choice → agent-browser operation → new observation. They add no site-specific parsers, second planner, speculative fallback agent or context-scoring layer. Fresh measurements of this package, rather than another project's headline, determine its performance claims.
