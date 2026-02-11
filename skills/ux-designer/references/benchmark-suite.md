# UX Designer Benchmark Suite

This suite validates skill quality changes with a controlled before/after run.

## 1) Scope
- Use the same 10 prompts in the same order before and after changes.
- Generate identical artifact types per screen.
- Score with one rubric for both runs.

## 2) Artifact Contract (per screen)
Required files:
- `spec.md`
- `index.html`
- `style.css`
- `scorecard.md`
- `screenshot-desktop.png`
- `screenshot-mobile.png`

Directory structure:
- `tmp/work/ux-designer-benchmark/before/01-...10-...`
- `tmp/work/ux-designer-benchmark/after/01-...10-...`
- `tmp/work/ux-designer-benchmark/comparison-summary.md`

## 3) Curated 10-Screen Progression
1. Auth sign-in screen (single form, validation states)
2. Search results page (empty/data/error variants)
3. Profile/settings form with destructive action confirmation
4. Product list with filter/sort and pagination
5. Multi-step onboarding wizard
6. File upload manager with progress/failure/retry
7. KPI analytics dashboard (density-sensitive)
8. 3-pane support workspace (inbox/list/detail)
9. Workflow builder with conditional branches and errors
10. Operations control center (high density + critical alerts + role actions)

## 4) Scoring Rubric (100 points)
- Design intent declaration quality: 10
- Anti-generic justification quality: 10
- Hierarchy audit quality: 10
- State matrix completeness/depth: 15
- Motion spec usefulness: 10
- Density strategy correctness: 10
- Edge-case simulation coverage: 10
- Consistency/drift checks: 10
- Accessibility rationale quality: 10
- Output mode correctness: 5

## 5) Acceptance Criteria
- After-score mean improves by at least 15 points.
- No regression greater than 5 points in any category average.
- At least 8 of 10 screens score 80+ after changes.

## 6) Run Protocol
1. Complete `before` run using pre-upgrade skill behavior.
2. Apply skill updates.
3. Complete `after` run with same prompts and artifact contract.
4. Score each screen with rubric evidence.
5. Publish aggregate deltas in `comparison-summary.md`.

## 7) Validation Checklist
- Same prompt text used in both runs.
- Same run order (1 through 10).
- Same artifact set per screen.
- Scorecards include category-by-category evidence, not totals only.
