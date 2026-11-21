# 🎨 UX Designer

Build, refine, critique or specify an interface using the feature-first design and visual systems of Adam Wathan and Steve Schoger. The skill applies those principles to marketing pages, product flows, data-heavy workspaces and responsive layouts. [Refactoring UI](https://refactoringui.com/)

## Install

```bash
npx skills add gabeosx/agent-skills --skill ux-designer
```

Choose your agent when prompted. The [repository installation guide](../../README.md#install-a-skill) covers CLI requirements and installation scope.

## Use it

Describe who uses the product, what they need to accomplish, and the existing brand or implementation constraints. Specify whether you want a working interface, critique, refinement or design handoff.

> Build a responsive inventory dashboard for warehouse leads. The primary task is finding items that need replenishment. Use our existing design system and cover loading, empty and error states.

> Review this form for visual hierarchy, keyboard operation and responsive wrapping. Point out what needs to change before implementation.

Start with the [skill instructions](SKILL.md). The [visual system](references/design-standards.md), [interaction patterns](references/interaction-patterns.md) and [design handoff](references/templates.md) provide details for the task. Browser verification needs a runnable interface and browser access.

## Prototyping and migration

The CSS and framework assets are optional examples. Projects updating a direct import of the original CSS should apply `.ux-prototype` to the area meant to receive prototype styling, set intentional page and component styles, and check any overridden status colors. Version 2.0.0 scopes prototype styling and removes the universal margin and padding reset. Use the [asset integration guide](references/templates.md#optional-starter-assets) for CSS and Tailwind v3 or v4.

## Benchmark

The [browser benchmark](../../benchmarks/ux-designer/README.md) records the fixed briefs, independent design review rubric and rendered comparisons. The [accessible-name follow-up](../../benchmarks/ux-designer/accessibility/REPORT.md) covers the booking regression and two fresh blind comparisons.
