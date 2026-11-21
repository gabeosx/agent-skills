# Accessible names follow-up

The prepared UX Designer 2.0.0 now tells implementers to preserve visible labels in computed accessible names. Text-rich native buttons can take their name from their contents. When a name override is necessary, the guidance asks for the complete visible label in order and a browser check after reflow or state changes.

The comparison starts from the exact prior 2.0.0 skill selected in the original UX campaign. The follow-up changes two files, keeps the prepared version number, and leaves the earlier benchmark artifacts in place. The added guidance was frozen before two independently authored briefs were opened. Fresh actors used the same prompt, local tool environment and inherited Codex model with no model override. Usage, charges and an exact service model revision were unavailable. [Frozen inputs](evidence/manifest.json) · [Execution log](evidence/events.jsonl)

## Booking regression

The controlled repair removed one explicit `aria-label` from the booking card template in a copy of the previously tested schedule. The visible contents now supply the button name. The browser evaluator confirmed the original issue and the repair at each supported width.

| CSS width | Original matching names | Repaired matching names | Axe label-in-name result after repair |
|---:|---:|---:|---|
| 1440 | 0/8 | 8/8 | Clear |
| 834 | 0/8 | 8/8 | Clear |
| 390 | 0/8 | 8/8 | Clear |

All three scripted workflows passed before and after the controlled edit. The desktop, tablet and phone screenshot hashes matched exactly. The original source, repaired copy and their reports are retained. [Controlled comparison](evidence/booking/comparison.json) · [Original browser report](evidence/booking/control-before/browser/report.json) · [Repaired browser report](evidence/booking/control-after/browser/report.json) · [Repaired names](evidence/booking/control-after/names.json)

An independent actor also rebuilt the booking task with the patched skill. The new implementation passed all 24 button-name checks, all three scenarios and the initial-state axe scan at every width. The rebuild verifies the skill on a known task. [Rebuild browser report](evidence/runs/development/candidate/h3/browser/report.json) · [Rebuild name checks](evidence/runs/development/candidate/h3/names.json)

## Fresh blind comparisons

| Task | Prior 2.0.0 | Patched 2.0.0 | Preference |
|---|---:|---:|---|
| Northbank Tramway shift handover | 83 | 86 | Patched, medium confidence |
| Carrick Museum loan review | 83 | 89 | Patched, medium confidence |
| Mean | 83.0 | 87.5 | Patched in 2 of 2 pairs |

Both versions passed all six frozen workflows and all 18 fresh-task button-name checks per version across the three widths. Initial-state axe scans had zero serious or critical findings. The blind reviewer preferred the patched tram output's aligned metadata and clearer next action. On the museum task, the reviewer preferred its reading order, tablet label spacing and separation between the selected choice and the note field.

The 4.5-point mean difference describes these four implementations. The observed name-matching improvement comes from the booking regression, since all four fresh implementations already passed that check. One actor generation per task and two blind comparisons give limited evidence about visual performance beyond these briefs. [Anonymous grades](evidence/panels/follow-up.agent.json) · [Paired scorecard](evidence/panels/follow-up.summary.json)

The reviewer also examined 14 separately captured interaction screenshots under the same anonymous IDs. Both tram outputs showed the tested card selections and tablet focus, and both museum outputs showed the required-note error, retained the choice, and displayed the expected confirmation after correction. No acceptance blocker emerged. The supplemental review kept the original scores and records limits for hover, mobile error placement and screen-reader announcements. [Blind interaction-state review](evidence/panels/follow-up.states.json)

## Reproduce the checks

Install the dependencies and pinned Chromium described in the [browser harness guide](../harness/README.md). From this directory, use a fresh destination for each run.

```sh
node ../harness/capture.mjs briefs/h3 evidence/booking/control-after/site /tmp/uxd-booking-browser-rerun
node check-names.mjs briefs/h3/name-hooks.json evidence/booking/control-after/site /tmp/uxd-booking-names-rerun.json
```

The main browser harness serves the site on loopback, runs the frozen functional scenarios and scans the initial state with axe. The supplemental test opens the same self-contained site, starts a fresh context at each width, and checks whether a browser role-and-name query finds the expected button by its complete visible text. The check ignores case and collapses whitespace. It supplements the axe rule and does not simulate a speech-control product.

To reproduce the model setup in a disposable workspace, copy the parent benchmark's `ACTOR.md`, `GRADER.md`, `RUBRIC.md`, `campaign.py`, `score.py` and `harness/` and use the briefs and frozen snapshots here. Follow the [parent benchmark guide](../README.md) to start fresh actors, render each static site and score anonymous pairs. The two follow-up briefs are now observed and suitable for regression runs. Use unseen briefs for another transfer evaluation.

## Local validation

The skill structural validator, repository release contract, Markdown links and diff checks passed. The evidence audit verified both frozen snapshots, brief fingerprints, five generated interfaces, two booking controls and four supplemental capture runs. The unrepaired booking control was the expected accessibility failure. All 21 primary scripted workflow scenarios passed.
