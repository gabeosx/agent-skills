# Changelog

All notable skill changes are recorded in this file. Each skill is versioned independently according to [Semantic Versioning 2.0.0](https://semver.org/), and this file follows [Keep a Changelog 2.0.0](https://keepachangelog.com/en/2.0.0/). The canonical version of a skill is the quoted `metadata.version` value in its `SKILL.md` frontmatter.

## Unreleased

### Repository

- Updated the skill catalog description and setup link to match the simpler Agent Browser Jev README.

- Updated the Agent Browser Jev catalog entry for continuous control, resumable tasks and direct final-page evidence.

- Updated the Agent Browser Jev catalog entry and setup link for its simplified installation and fresh benchmarks.

- Added CI for Agent Browser Jev's offline regression suite on Node 20.3.0 and 24, including symlink installation behavior and the repository release contract.

- Added Agent Browser Jev to the skill catalog with `npx skills` installation guidance and a detailed human-facing README requested for this skill.

- Added canonical agent instructions and a dependency-free release-contract validator requiring every affected skill change to include an independent Semantic Version increment, a matching root changelog entry, relevant validation, and scoped cleanup evidence.
- Required repository-only changes to be recorded without inventing unrelated skill version bumps, and documented the definition of done and release-tagging workflow.

## agent-browser-jev 1.0.1 - 2026-09-25

### Changed

- Tightened the README around the product's actual value: when to delegate a multi-step browser task, when to use agent-browser directly, and what the current release evidence shows. Moved benchmark caveats and comparison framing out of the overview so the README reads like product documentation rather than a methodology disclaimer.

## agent-browser-jev 1.0.0 - 2026-09-25

### Added

- Added a local browser gym that repeats workflow, autocomplete and short-task cases, retains failed outcomes, and reports independently checked results, helper time and Jev charges. The refreshed current-version run passed 52/52 synthetic checks; earlier keyboard-selection failures remain documented.
- Added a 26-case common-component gym derived from WAI-ARIA APG and current Base UI, Radix, MUI and shadcn inventories. It independently checks accordions, menus, overlays, selection controls, navigation, data views, workflows, delayed feedback, upload, hover and safe handoffs; the final 1.0 run passed 26/26 at $0.005191 in provider-reported Jev charges.
- Added a reproducible cross-project component benchmark for the same OpenRouter Decisions endpoint, Jev model and agent-browser runtime. Against pinned `forvela/jev-agent-browser` 0.1.7, this helper passed 26/26 while the comparison arm passed 11/26; the 15 differential cases were repeated twice more, passing 30/30 versus 0/30. This is a synthetic functional comparison, not an ecosystem ranking.
- Added a seeded multi-page travel challenge. An isolated Codex caller receives a generated goal, exact values and starting page, delegates the whole task to Jev without browser takeover, and is scored against server-side selections and the final fake hold. Reports retain seeds, failures, whole-task timing, caller tokens and Jev charges for replay.
- Initial strict challenges independently passed 2/3 selected seeds. The native-date case stalled on repeated waits and exhausted its action budget; two text-date cases completed, including one with conditional checked baggage. After the resulting date and wait fixes, the 1.0 release run passed 3/3 newly generated seeds, including two native-date cases. The failure and earlier caller-recovery attempt remain in the evidence.

### Changed

- Replaced the file-oriented integration surface with a direct agent invocation: one bounded command accepts the goal and exact values, then returns the final observation, compact action trace, timings and Jev usage as a single JSON object on stdout. Expected handoffs are now valid tool results rather than nonzero process exits.
- Resume now uses a compressed, encrypted, authenticated token returned in the result. The token carries the original session, goal, operation allowlist, progress and recent actions without a result file or resident process, expires after 30 minutes and fails closed if changed or opened under another configured key.
- Added repeatable operation and exact-accessible-name allowlist arguments so the calling agent can narrow browser authority without loading executable policy code.
- Rewrote the README and benchmark guide for general users: setup and API-key instructions come first, benchmark clocks and costs are separated, and limitations sit beside the measured results. Removed local browser-build and accounting-pilot language from the public overview.
- Updated the open-source comparison to describe current project strengths without claiming a head-to-head win. Default permissions are unchanged.
- Added grounded contextual hover and exact caller-path file upload actions. Both are independently checked in the component gym; uploads never open a chooser or invent a path.

### Fixed

- Withhold arrow/Enter selection from autocomplete inputs after repeated live runs showed that similar keyboard-only options can commit the wrong record. Accessible options remain clickable, ordinary text/search fields retain Enter submission, and keyboard-only pickers now return control without a false successful confirmation.
- Enter caller-supplied ISO dates through observed native Month, Day and Year controls when browser `fill` on their virtual refs reports success without changing the input. Stop offering waits after five unchanged attempts so a static validation error prompts another action or handoff. Both the previously failing native-date seed and a text-date regression seed passed on final replay without caller browser takeover.
- Take one bounded quiescence observation when a clicked target remains on screen, preventing asynchronous command palettes and similar widgets from turning an intermediate selected state into a repeated stale click. After an uncertain gesture, attempt one fresh readback for the caller without replaying or allowing another gesture.

### Removed

- Removed task JSON files, executable policy modules, caller-selected result/evidence paths and file-based resume. This is an intentional incompatible reset for the unreleased project: the helper is an agent tool, not an interactive or backwards-compatible CLI product.

## agent-browser-jev 0.3.1 - 2026-09-25

### Fixed

- Distinguish custom autocomplete/listbox options from native HTML dropdowns. Keep editable search fields available and click observed suggestions instead of issuing a native select command to an ARIA listbox.
- Support ArrowUp alongside ArrowDown and Enter for keyboard selection, including readonly custom comboboxes. Require caller evidence of a committed selection rather than treating typed filter text as completion. Direct keyboard-only selection to caller control because Jev chose incorrect suggestions in live tests.
- Add real-browser autocomplete acceptance that independently checks selected record IDs, including keyboard-only Enter selection. Retain failed keyboard-inference/Tab experiments; Tab is not offered because the model selected an incorrect record.

## agent-browser-jev 0.3.0 - 2026-09-25

### Added

- Added continuous browser control for native selects, explicit checkbox states, scrolling, keyboard actions and back navigation, alongside observed clicks and exact-value fills.
- Added resumable tasks and missing-input requests: preserve the goal, completed intents and recent actions, then observe fresh controls before continuing in the original session and policy.
- Return the final observed page directly with freshness/truncation flags, Jev charges and separate observation, decision, action and navigation timings. An optional starting URL combines navigation and execution in one invocation.
- Added real-browser acceptance for sustained report creation, input and budget continuation, keyboard searches and scrolling; retain results separately from model-reported completion. Published a fresh native-Codex comparison: 69.6 versus 15.9 seconds median on one 12-action workflow, with 3/3 independently verified outcomes per arm and explicit cost-estimate limits.

### Changed

- Default execution budgets now allow 30 actions, 60 decisions and 120 seconds, with direct CLI overrides. Candidate overflow and repeated actions without an observed effect return control explicitly.

## agent-browser-jev 0.2.1 - 2026-09-25

### Fixed

- Clarified caller handling of handoffs: stopping correctly does not establish the requested outcome, and any later caller recovery must remain distinct from the helper's result.
- Updated the actual-Codex comparison to load the matching skill instructions, retain helper outcomes automatically, separate UI checks from caller-status checks, and preserve GPT usage and Jev charges. Earlier failed trials remain available.
- Added helper and decision elapsed times to evidence, and reviewed published browser integrations to distinguish action latency, whole-task latency, browser overhead and interface-dependent reliability. Published the fresh 36-trial replay, including two caller verification failures, token totals and explicitly estimated API-equivalent cost. Documented the local Chrome 154 stalls and the Chrome 151 build used for the completed replay.

## agent-browser-jev 0.2.0 - 2026-09-25

### Added

- Added one-time setup with a hidden OpenRouter key prompt, private saved configuration, dependency installation and automatic local agent-browser installation when absent. Existing browser forks and environment/secret-provider credentials remain supported.
- Added a plain-language `--intent` command with named exact values, default session/browser settings and automatic evidence storage. Task files and custom policies are now optional; the default offers all observed supported controls and passes visible page content to Jev. The low-level API retains its original authorization contract.
- Added fresh repeated benchmarks on new generic help-center, support-form, preferences and search fixtures. The comparison runs actual Codex sessions using agent-browser directly versus Codex using Jev, including caller orchestration and independent success checks; it does not substitute a GPT API call into the Jev loop.

### Changed

- Rewrote the README around installation, API-key setup, everyday use and concrete measured value. Moved integration detail to the API reference and replaced earlier evidence pages with the fresh benchmark; historical reports remain in Git history.

## agent-browser-jev 0.1.2 - 2026-09-24

### Fixed

- Corrected the global Codex dependency-installation path to the actual `npx skills` destination, `~/.agents/skills/agent-browser-jev`, and documented stale manual-copy migration. Runtime and acceptance-fixture sources are unchanged from 0.1.1. Published a second six-scenario passing report from a fresh GitHub installation.

## agent-browser-jev 0.1.1 - 2026-09-24

### Fixed

- Fixed CLI execution through symlinked files and skill directories; the previous entrypoint could silently exit with success without running.
- Preserved the previous observed screen and explicit caller-supplied values in Jev's request, so progress and fill decisions retain their context.

### Added

- Added an opt-in real-browser/real-Jev suite using general-purpose local fixtures, independent event/readback assertions, source hashes, model charges, elapsed times and scoped cleanup. Published all development attempts as well as the passing six-scenario run.
- Added regression coverage for symlink entrypoints and retained prior observation context, bringing the offline suite to 24 tests.

### Changed

- Made the README and skill instructions application-neutral. Replaced private historical prototype timing claims with reproducible measurements of the current packaged CLI, explicit claim-to-test mappings and a documented proof boundary.

## agent-browser-jev 0.1.0 - 2026-09-24

### Added

- Introduced a portable Jev-assisted browser action loop, CLI, pinned dependencies and 22 tests. The helper reuses an existing agent-browser session, accepts caller-owned permissions/privacy and secret loading, and returns model-assessed progress with observed evidence.
- Documented installation with `npx skills`, API/CLI integration, original design rationale, historical prototype comparisons and the separate live read-only acceptance of the generic helper.
- Kept business logic, site-specific permissions, credentials and private browser evidence outside the shared package. Initial live acceptance is supervised read-only Xero use; arbitrary-site reliability and consequential writes are not established.

## apple-container-skill 1.2.0 - 2026-09-20

### Added

- Added experimental single-node `container k8s` workflows, scoped `container clean` guidance, build-time SSH forwarding, additive masked/read-only path controls, and diagnostics for the current command surface.
- Added security routing for Apple Container 1.3.1 and 1.4.1 fixes affecting crafted identifiers, image layers and layouts, registry authentication, and host-file access.

### Changed

- Raised the supported operating-system guidance to macOS 26+, made Apple Container 1.4.1 the September 2026 baseline for untrusted OCI inputs, and required comparison of the client, service, and current signed release.
- Updated Container Machine selection for 1.3+ so agents first verify `/sbin/init` and can use current standard images directly, while retaining derived OpenRC/systemd recipes for older or service-oriented workloads.
- Updated registry guidance for the removal of `--scheme auto`, documented default HTTPS, and made installed command help authoritative when generated references lag the parser.

### Fixed

- Corrected cleanup, Kubernetes lifecycle, and nested-command help examples against the signed and notarized 1.4.1 release payload without replacing the host runtime.

## devcontainer-helper 1.1.0 - 2026-09-20

### Added

- Added Dev Container CLI 0.89.0 OCI authentication hardening guidance for bearer realms, registry credential forwarding, token redirects, and exact reviewed cross-origin authentication-host mappings.
- Added hardened configuration/build validation and reporting requirements for externally hosted OCI Features, Templates, and registry metadata.

### Changed

- Added explicit WSL Containers Public Preview version floors of WSL 2.9.3+ and Dev Container CLI 0.88.0+, with target-specific validation instead of implied Docker or Compose parity.
- Documented the Dev Container CLI version boundaries for stable lockfiles, WSL Containers support, and OCI authentication hardening.

## apple-container-skill 1.1.0 - 2026-08-04

### Added

- Added release-aware symptom routing for Apple Container 1.1 and 1.2 fixes, including relative copy paths, non-root Unix sockets, environment inheritance, build contexts, published-port stalls, and machine timeouts.
- Added decision guidance and live-tested workflows for host-created versus container-created Unix sockets, explicit environment passthrough, justified kernel arguments, service-first port diagnosis, and shutdown signals.
- Added diagnostic probes for the shipped `run` command surface and blind forward evaluations for machine automation and socket troubleshooting outcomes.

### Changed

- Replaced the incomplete Alpine machine recipe with a validated `openrc-init` image and documented the PTY-backed first-run initialization boundary for later headless automation.
- Reframed new 1.2 capabilities around when and why to use them, verification steps, security implications, and upgrade-before-workaround decisions instead of merely enumerating flags.
- Updated runtime evidence from the signed Apple Container 1.2.0 payload on macOS 26.5 arm64.

### Fixed

- Corrected shutdown guidance after confirming the shipped 1.2.0 CLI does not expose the release-note-only `container run --stop-signal`; agents now use image `STOPSIGNAL` or `container stop -s`.

## devcontainer-helper 1.0.0 - 2026-07-14

First formal versioned release. Earlier development was unversioned and remains in Git history.

### Added

- An inspection-first workflow that makes agents discover repository constraints before choosing an environment architecture.
- Decision guidance for selecting a base image, Dockerfile, or Compose topology, with databases, caches, brokers, and other supporting services defaulting to sidecars.
- Task-time verification of Ubuntu LTS images and Features against official sources, including architecture support and third-party Feature vetting.
- Security guidance for non-root operation, trusted Features, least privilege, secret handling, Docker socket risk, and justified use of Docker-in-Docker.
- Reproducibility guidance for `devcontainer-lock.json`, frozen-lockfile CI validation, Dependabot's `devcontainers` ecosystem, prebuilt images, and native amd64/arm64 CI.
- Codespaces guidance for prebuild-aware lifecycle placement, `hostRequirements`, recommended-secret metadata, port visibility, mount limitations, and `customizations.codespaces`.
- Compatibility guidance for Docker, Podman, Codespaces, and preview WSL Containers.
- Progressive references for architectural decisions, current configuration patterns, validation, troubleshooting, and scoped cleanup.
- A minimal parameterized starter template whose verified image and context-dependent values must replace explicit sentinels before delivery.

### Changed

- Reframed the skill from a configuration generator into an architecture, security, portability, maintenance, and validation guide.
- Preserved an existing project's distro by default and prohibited silent OS-major upgrades.
- Required explicit Ubuntu release tags; floating `:ubuntu` and `:latest` tags are no longer acceptable.
- Made lifecycle recommendations deterministic and Codespaces-prebuild aware, including the parallel execution behavior of object-form lifecycle commands.
- Routed Playwright environments to the official Playwright image or project-version-matched installation instead of an invented official Feature.
- Preferred the official Node Feature's pnpm option when appropriate.

### Removed

- The stale monolithic cheatsheet and legacy top-level Dockerfile/context examples.
- Hard-coded Feature recommendations that could become stale, including the nonexistent official Playwright Feature.
- Floating Ubuntu defaults and unjustified all-in-one, privileged, or Docker-in-Docker architectures.

## apple-container-skill 1.0.0 - 2026-07-14

### Added

- Established the current skill as its first formal versioned baseline. Earlier unversioned development remains in Git history.

## github-scrum-flow 1.0.0 - 2026-07-14

### Added

- Established the current skill as its first formal versioned baseline. Earlier unversioned development remains in Git history.

## macwhisper 1.0.0 - 2026-07-14

### Added

- Established the current skill as its first formal versioned baseline. Earlier unversioned development remains in Git history.

## ux-designer 1.0.0 - 2026-07-14

### Added

- Established the current skill as its first formal versioned baseline. Earlier unversioned development remains in Git history.
