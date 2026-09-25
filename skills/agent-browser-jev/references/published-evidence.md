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
