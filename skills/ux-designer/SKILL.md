---
name: ux-designer
description: Design, build, critique, and refine user interfaces using Refactoring UI principles. Use for product screens, responsive web interfaces, marketing pages, data-heavy tools, flows, and implementation-ready visual specifications.
metadata:
  version: "2.0.0"
---

# UX Designer

Make the user's next decision clear and give the product a visual character that fits its audience. Use the product's actual content, data and states to make design decisions.

## Choose the right work

- **Build:** Implement the requested experience in the existing stack, including the actions and states that make its main flow work. Use an existing system where it serves the design.
- **Refine:** Inspect the current interface and exercise its main path. Preserve working content, navigation, behavior and brand constraints. Fix the largest visible or interaction defect first and compare the same viewport before and after.
- **Critique or specify:** Prioritize concrete observations and fixes, with affected elements, states and widths. Use the [handoff templates](references/templates.md) for a specification or system deliverable.

When input is incomplete, infer reversible choices from the audience, content and existing UI. Ask when different answers would materially change the work or when the action needs authorization.

## Design the feature

1. **Start with what people need to do.** Identify the decision, evidence and action. Assemble the main working region with realistic content at low fidelity. Let that region determine what navigation, framing and supporting information the page needs.
2. **Set one direction.** Describe the appropriate personality in a few words. Translate it into type, color temperature, spacing, shape and one recognizable visual detail. Let a useful piece of product evidence carry the visual idea when it can. Keep operational screens calm where rapid comparison matters.
3. **Place and rank the content.** Decide what should register first, what supports it, and what can recede. Try reducing competing color, weight or decoration before increasing the focal element. Use spacing to show relationships. Give each region a clear visual lead. Choose whether size, weight, color or placement will carry most of its emphasis, then keep supporting roles quieter. Keep meaningful labels, headings, landmarks and row/column headers at a readable size.
4. **Make the system fit the feature.** Reuse a small set of type, spacing, color and surface roles. Set the content width by reading measure and actual data. At narrower widths reduce decorative space and secondary chrome first, then adapt navigation, columns or controls so the user's decision stays possible. Keep styling quirks local to the component that needs them.
5. **Complete and inspect the interaction.** Implement necessary state changes with accessible names, visible focus, keyboard support and useful feedback. Use native semantics and preserve the visible label in each control’s computed accessible name. Provide a clear way to exit overlays. Keep errors close to the field or action, preserve input, and confirm genuinely consequential actions in context.

## Inspect the working interface

Open the implementation in a browser. Look at desktop, an intermediate width and a narrow touch layout. Check the first fold, useful information density, alignment and contrast. Compare the rendered title, supporting labels and real data at their actual sizes. Look for words closing up, weights collapsing into one tier, stranded line endings and controls or callouts that compete with the task. Exercise the main action with a realistic value and a relevant exception. Check focus and responsive behavior, including dialog edges and any internal scroll region. When a control’s visible text changes or reflows, inspect its computed name at each affected width. Make the most valuable visible correction, then recapture or rerun the affected view. If rendering is unavailable, state what was verified.

## Load supporting guidance when useful

- [Visual system](references/design-standards.md) for typography, spacing, palette construction, contrast and depth.
- [Tactical moves](references/tactical-moves.md) for composition, visual identity, imagery, polish and reference-driven critique.
- [Interaction patterns](references/interaction-patterns.md) for comparison, dense data, responsive navigation and multistep forms.
- [Handoff templates](references/templates.md) for specs, critique, and CSS or Tailwind integration.
