# Independent review of five new skill READMEs

Reviewed October 23, 2026 by a reviewer separate from the drafter. Scope: the new human-facing READMEs for Natural Writing, Benchmark Improvement Loop, DevContainer Helper, UX Designer, and GitHub Scrum Flow. This review applies Natural Writing's source-fidelity, reader-relevance, and procedural-coverage guidance alongside the Documentation skill.

## Method and limits

Compared every README with its current `SKILL.md`, followed the relevant local reference and asset links, and checked Natural Writing's evaluation summary against the retained procedural-writing report. Reviewed the five metadata-only version changes and matching changelog headings. The Git diff confirms that these entrypoint changes alter only `metadata.version`; no new writing behavior is being evaluated here.

All relative README targets exist. The shared `../../README.md#install-a-skill` anchor also exists. The Natural Writing evaluation URL names the same repository path as the locally retained report; this pass did not fetch the remote URL or repeat installer execution. Repository release validation remains the main task's responsibility.

No model comparison, benchmark campaign, container workload, browser build, GitHub issue update, branch push, or PR creation was performed for this review. The documented workflows were read as source material, not treated as instructions authorizing those actions.

## Actionable finding

### P2: GitHub Scrum Flow softens an unconditional pnpm verification requirement

**Location:** `skills/github-scrum-flow/README.md:31` in the initial draft.

The README says test, lint, and type-check expectations apply “for projects that provide those commands.” The current entrypoint's Phase 3 Final Verification instead unconditionally says to ensure all tests pass and ensure `pnpm lint` and `pnpm type-check` pass. The README therefore presents a broader, conditional project-compatibility contract than the actual instructions supply.

Because this release intentionally leaves the workflow unchanged, describe the existing pnpm-specific expectation and its applicability limitation, rather than implying that the entrypoint already substitutes or skips unavailable commands. Changing the agent instructions would be a separate behavioral decision. No additional runtime test is needed to establish this text mismatch.

## Coverage and source fidelity

| README | Assessment |
| --- | --- |
| Natural Writing | Faithfully describes drafting, editing, review, requested scope, voice samples, preserved facts and uncertainty, contextual examples, procedural checks, normal-route/recovery distinctions, and separate domain verification. The lack of runtime tools is a skill requirement distinction; the shared installer still has its own requirements. The 30/30 result in each arm and final ties match the final eight-scenario procedural comparison. The README retains the absence of measured advantage and human preference, rather than presenting the patch version as a new behavioral experiment. |
| Benchmark Improvement Loop | Correctly describes a workflow rather than a bundled runner. Separates first attempts, purpose-logged retries, frozen confirmation and independent outcome checks. Credentials, model access, infrastructure, paid authority and unattended authority are not supplied by installation. Campaign execution needs an environment and restoration path; planning alone does not require starting services. Failed isolation stops the affected lane without deleting trial history. Confirmation-informed changes consume that set as development material. No broad reliability claim is borrowed from archived Jev studies. |
| DevContainer Helper | Correctly links architecture selection, current official source verification, repository inspection, preservation of working choices, Features, lockfiles and lifecycle placement. Local CLI/runtime requirements are conditional on build checks, while Codespaces and other declared targets require their own access and validation. Preserves secret boundaries, host-Docker authority, sidecar preference, untested-target reporting and scoped cleanup. The template is correctly labeled image-based and conditional on choosing that architecture, with placeholder replacement required. |
| UX Designer | Matches the current instructions and assets on Refactoring UI hierarchy, reusable scales, responsive intermediate widths, dense interfaces, component states, native control semantics, readable disabled states and high-risk confirmation. Full-spec sections match the linked templates. The entrypoint supports specific visual rules separately, so the README's smaller-request route does not invent a full-spec requirement. Browser/build access is required for the prescribed visual checks, rather than for every planning request; installation alone does not prove those checks passed. |
| GitHub Scrum Flow | Correctly describes the issue/track/branch relationship, `plan.md`, Git and `gh`, atomic scoped work, PR handoff, no local merges to main, and authorization boundaries. It does not claim that installation grants repository authority or that a ready PR is approved to merge. The pnpm verification caveat above needs correction to match the unchanged source. |

Natural Writing's evidence remains tied to frozen 1.0.0 snapshots; the current 1.0.1 entrypoint differs only in version metadata. The README's summary makes no causal claim that Natural Writing alone improved outputs, and does not turn agent review into human validation. The linked report preserves first-candidate failure, repaired development, reserved confirmation, equal baseline outcomes and unmeasured runtime/cost details.

The matching changelog headings inspected were Natural Writing 1.0.1, Benchmark Improvement Loop 1.1.1, DevContainer Helper 1.1.1, UX Designer 1.0.1, and GitHub Scrum Flow 1.0.1. Their documentation-only descriptions agree with the inspected metadata-only instruction diffs.

## Optional refinements

UX Designer's input paragraph could also mention the success metric, which the entrypoint lists alongside goal and primary action in its clarification condition. The current paragraph does not expressly deny that condition, and the full instructions are linked; this is an optional completeness refinement rather than an unsupported-capability defect.

No additional style-only changes are needed. The repeated installation sections are useful per-skill entrypoints, and the examples communicate distinct tasks rather than adding promotional claims.

## Initial fingerprints

| README | SHA-256 |
| --- | --- |
| `skills/natural-writing/README.md` | `d19b4ee0568ebc30ee5d26a322e605909fb7a2082aa5eee0e30e57c0af4f1b50` |
| `skills/benchmark-improvement-loop/README.md` | `486c967819af437d547fa3e7950c652b780881ce397a474574b4c1a9b16496ef` |
| `skills/devcontainer-helper/README.md` | `a0f7301f87f11f8f8827e3104350b2dc7001b4add14679fabae83946f6b44ceb` |
| `skills/ux-designer/README.md` | `2f45832d25e89b90694f3048b652bfeb7cfc48f0bab15047da8dfb91010a7da6` |
| `skills/github-scrum-flow/README.md` | `7142407679ecec6089199e690cb13d8501d6e94df1dab29a9f3a1d5d60ad0ecf` |

The procedural report checked had SHA-256 `e3fb608113b4e980598899a29c0527eba8d93b1cebbad83b2cff0223cfcb42db`.

## Initial verdict

Four READMEs have no consequential source-fidelity defect. Correct the GitHub Scrum Flow verification description, then recheck that passage. No fresh behavioral experiment is justified by these metadata-only entrypoint changes and human-facing additions.

## Targeted source recheck and final verdict

The drafter corrected `skills/github-scrum-flow/README.md:31`. It now explicitly states that tests, `pnpm lint`, and `pnpm type-check` must pass, and that projects using another toolchain need to reconcile the pnpm-specific requirement with their own checks. This agrees with `SKILL.md:77-79` without claiming that the unchanged entrypoint already supplies a generic fallback. The original P2 finding is resolved; its initial wording and fingerprint remain above.

The rechecked GitHub Scrum Flow README SHA-256 is `2fd798406a305f3b173232ecac8b95b9076226d48d28d5b8b1794183fccffcf3`; its source `SKILL.md` remains `d50dd82c79681c489ef20a1c71d1a8fb3f38442b9379755c899a9bbba1bc8de5`.

The drafter also adopted the optional UX input clarification. `skills/ux-designer/README.md:15` now asks what counts as success and names goal, primary action, or success metric in the clarification condition, matching the entrypoint's stop condition. Its rechecked SHA-256 is `18d09408c60d729ea6101d0499b4ae16c3b2d9b5cd4f5f9a06177b679eaf5c7b`.

All five READMEs now pass this independent source-fidelity and reader-coverage review. No new runtime or behavioral claim was introduced by these corrections, and no fresh behavior experiment was performed. The owned review report passes `git diff --check`; publication and release validation remain with the main task.
