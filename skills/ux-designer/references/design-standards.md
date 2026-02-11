# Design Standards and System Integrity

## Table of Contents
1. Spacing System
2. Typography System
3. Color System
4. Elevation and Depth
5. Imagery
6. Responsive Behavior
7. Density Mode Mapping
8. State Matrix Requirements
9. Motion Standards
10. Consistency and Drift Detection

## 1. Spacing System
Rule: use a fixed scale to avoid pixel-pushing and preserve rhythm.

Scale (px):
- `2, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256`

Tactical rules:
- Grouping: space between groups should be meaningfully larger than space within groups.
- Prefer whitespace before borders when separating sections.
- Use generous padding for hero sections and modals.

## 2. Typography System
Rule: use a limited type scale to express hierarchy.

Scale (px):
- `12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72`

Hierarchy moves:
- Prioritize contrast by de-emphasizing secondary text.
- Avoid translucent white for secondary text on colored backgrounds.
- Use high-contrast disabled text/background pairings, not opacity-only disabled states.
- Keep readable line length around 45-75 characters.

## 3. Color System
Rule: maintain semantic color role discipline and WCAG AA contrast.

Palette structure:
- Neutrals (`gray-50` to `gray-900`) for text/surfaces/borders.
- Primary brand for primary actions and small accents.
- Feedback colors for danger/success/warning.

Alias usage:
- `text.primary`, `text.secondary`, `text.tertiary`
- `bg.canvas`, `bg.surface`
- `border.subtle`
- `primary`, `primary.hover`, `on-primary`

Dark mode strategy:
- Light-on-dark using dark grays (avoid pure black backgrounds).

## 4. Elevation and Depth
Rule: shadows communicate elevation state, not decoration.

Levels:
- Level 0: flat/base content.
- Level 1: raised hover states.
- Level 2: overlays (dropdowns/popovers/sticky).
- Level 3: modals and drawers.
- Level 4: toasts and critical notifications.

Elevation clearance:
- If transformed/elevated elements extend outside bounds, container padding must exceed extension distance.
- Define explicit z-index layering for overlays.

## 5. Imagery
- Do not use low-resolution placeholders in final designs.
- When text overlays images, use scrims/contrast support to protect readability.

## 6. Responsive Behavior
Rule: large elements compress faster than small ones.

- Scale down headings on mobile; body text remains near 16px.
- Reduce section padding on smaller breakpoints.
- Use `flex-wrap` for KPI/metric rows and dense action groups.
- Desktop: multi-column where useful.
- Mobile: stack to single-column by default.
- Ensure touch targets are at least 44x44px.

## 7. Density Mode Mapping
Select one mode per screen or workflow:

| Density Mode | Use Case | Token Mapping Strategy |
| :--- | :--- | :--- |
| `Compact` | Data-heavy dashboards, operations tables | Shift one token step down for intra-component spacing where possible (`24->16`, `16->12`, `12->8`) while preserving legibility. |
| `Balanced` | Standard SaaS product surfaces | Use base token scale as defined. |
| `Spacious` | Guidance-first flows, low-density interfaces | Shift one token step up for section and container spacing (`16->24`, `24->32`, `32->48`) while keeping controls aligned. |

Rules:
- Do not introduce non-scale spacing values when changing density.
- State selected density mode in the spec.

## 8. State Matrix Requirements
For every interactive component, define all states:
- `Default`, `Hover`, `Active`, `Focus`, `Disabled`, `Loading`, `Error`, `Empty`

For each state, declare:
- Visual change mechanism: color, border, elevation, opacity, motion.
- Accessibility impact rationale.

State guidance:
- Focus: always visible keyboard indicator.
- Disabled: legible text and clear non-interactive affordance.
- Loading: preserve layout stability (avoid jank).
- Error: combine color with icon/text cue.
- Empty: include next-step guidance when possible.

## 9. Motion Standards
Motion must reinforce comprehension, not decoration.

Canonical timing:
- `fast`: 120ms (micro feedback)
- `base`: 200ms (most state transitions)
- `slow`: 320ms (layout-level transitions)

Easing:
- Standard: `cubic-bezier(0.2, 0, 0, 1)`
- Emphasized entry (sparingly): `cubic-bezier(0.16, 1, 0.3, 1)`

Motion usage:
- Use to reinforce hierarchy changes, contextual transitions, and feedback.
- Suppress in high-density data surfaces where motion harms scan speed.

Reduced-motion fallback:
- Respect `prefers-reduced-motion` by reducing duration and removing transform-heavy effects.

## 10. Consistency and Drift Detection
Use this checklist before handoff:
- Are all spacing values from the defined scale?
- Are all font sizes from the type scale?
- Are semantic color roles used consistently?
- Are elevation levels applied by meaning (not decoration)?
- Are any one-off values present, and if yes, are they justified?
- Does the selected density mode match the workflow context?
- Are motion choices consistent with declared intent and reduced-motion behavior?
