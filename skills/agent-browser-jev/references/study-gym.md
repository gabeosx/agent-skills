# Test, verify, improve

The component study runs the same local pages against two versions of the helper. The harness owns the tasks, starting state, hidden verifier and cleanup. Each arm uses its own helper code and the same configured Jev model and agent-browser executable. Run order alternates by variant and seed.

## Run a study

Install this skill's dependencies with `npm ci`. Prepare a separate baseline checkout of `skills/agent-browser-jev` and run `npm ci` there as well. The baseline path is read as code; it is never edited by the study runner. Use a new absolute output path:

```sh
npm run gym:study -- \
  --baseline-dir /absolute/path/to/baseline/skills/agent-browser-jev \
  --output /absolute/path/to/new-study.json
```

The default study exercises native dates, similar record selection, a delayed command palette, delayed feedback and a safe missing-target handoff. It runs each on the original page and three controlled variations: reordered controls, slower completion, and a hostile page-owned instruction with a decoy button. Use `--cases`, `--variants`, `--seeds` and `--rounds` to focus a failure or test fresh variations. For example:

```sh
npm run gym:study -- \
  --baseline-dir /absolute/path/to/baseline/skills/agent-browser-jev \
  --cases native-date,similar-record --variants base,reordered,slow \
  --seeds 11,12 --rounds 2 --output /absolute/path/to/date-selection-study.json
```

The report pairs tasks by round, seed, variant and case. It records helper file hashes, version, browser version, exact verifier conditions, return reason, time, provider-reported charge and a failure class. The adjacent `.runs` directory holds synthetic step traces. Helpers with the opt-in event hook record each observation, offered candidate set, chosen action, action readback and final reason; older baselines retain action readbacks only, marked `traceCoverage: actions_only`. Normal task invocations do not write these files. Keep study output private if fixtures are replaced with real pages; traces contain page text and supplied values.

To compare two existing component reports without calling Jev or opening a browser:

```sh
npm run gym:study -- \
  --baseline-report /absolute/path/to/baseline-components.json \
  --candidate-report /absolute/path/to/candidate-components.json \
  --output /absolute/path/to/comparison.json
```

## Read a failure

A case passes only when all named conditions hold: the helper exited normally, gave the expected completion or handoff reason, avoided the forbidden decoy, produced exactly one completion event when needed, saved the exact structured state, and left the expected final page visible. The study then labels the first useful failure category: infrastructure, scope violation, wrong committed state, premature completion, uncertain action, limit, incomplete handoff or no progress. Inspect the first divergent frontier and action readback in that case's trace before editing the controller, candidate discovery or decision prompt.

Repeat the failing case on its original seed, then on unused seeds and the full fixed matrix. The study verdict reports paired wins and regressions on the measured cases; it does not claim a population reliability rate or statistical significance from a small run. Keep failed and incomplete reports rather than replacing them with only passing attempts. If a candidate regresses any paired case, the study exits nonzero.

## Containment

This lane uses the existing Node helper, agent-browser, a loopback HTTP fixture and the configured OpenRouter key. It installs no BrowserGym, Python package, database or background service. Each component run closes its browser session and server and removes its temporary synthetic upload file; the report records those cleanup outcomes. The user-owned study reports remain at the requested output path.

The optional [BrowserGym MiniWoB study](browsergym-study.md) adds independent benchmark tasks in one ephemeral Docker container. It remains separate from this local component lane so both a controlled regression suite and an external task source can inform an improvement.
