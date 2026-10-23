# 🎨 UX Designer

Turn product requirements into interface specifications and implementation guidance using Refactoring UI principles. The skill covers visual hierarchy, reusable tokens, responsive layouts, component states, and dense tables and forms.

## Install

```bash
npx skills add gabeosx/agent-skills --skill ux-designer
```

Choose your agent when prompted. See the [repository installation guide](../../README.md#install-a-skill) for CLI requirements and installation scope.

## Use it

Describe the people using the product, the task they need to complete, the primary action, and what counts as success. Include branding, platform, technical constraints, and any existing design system. If the goal, primary action, or success metric is unclear, the skill asks for clarification before producing a full design.

For example:

> Design an inventory dashboard for warehouse leads. The primary task is finding items that need replenishment. Use our existing tokens and cover mobile, tablet, loading, empty, and error states.

> Review this form for hierarchy, numeric input precision, responsive wrapping, and destructive-action confirmation. Explain the changes needed for implementation.

A full specification includes a design brief, information architecture, component inventory, visual system, screens and flows, state matrix, and accessibility and QA checks. Smaller requests can focus on a specific component or visual rule.

## Implementation and verification

The skill uses spacing, typography, elevation, and sizing systems rather than isolated style values. It keeps primary actions clear and specifies behavior at intermediate widths, not just mobile and desktop endpoints. It also covers native control semantics, readable disabled states, and explicit confirmation for high-risk actions.

The bundled CSS tokens and Tailwind template support prototypes. A runnable build and browser access are needed for the prescribed visual checks: overflow, alignment, touch targets, intermediate breakpoints, and loading/error states. Installing the skill alone does not supply a rendering environment or establish that an interface has passed those checks.

## References and assets

- [Agent instructions](SKILL.md): workflow, state coverage, and quality checks.
- [Tactical moves](references/tactical-moves.md): hierarchy and visual emphasis.
- [Design standards](references/design-standards.md): tokens and component rules.
- [Specification templates](references/templates.md): the full response structure.
- [Core CSS](assets/design-system-core.css) and [Tailwind template](assets/tailwind.config.template.js): implementation starting points.
