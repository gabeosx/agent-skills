# Design handoff and prototyping

Use sections that help the recipient implement or evaluate the requested work. For a full design spec, include:

| Section | Useful detail |
|---|---|
| Design brief | Audience, core task, primary action, constraints and consequential assumptions |
| Information architecture | Content and relationships, navigation and entry/exit points |
| Visual system | Font and text roles, color and surface roles, spacing rhythm and visual emphasis |
| Screen or flow | Content order, main component, responsive changes and how the next action stays reachable |
| Components and states | Trigger, visible result, focus, keyboard behavior, data preservation and recovery where relevant |
| Verification | Browser widths and states exercised, observed defects, unresolved decisions |

For a critique, use a short list ordered by impact. For each defect name the visible element and state, the user consequence, the concrete correction and the condition that confirms it works.

## Responsive layout starting points

- **Reading or form:** Constrain the body copy or field column. Let short labels, key actions and validation survive enlarged text and a narrow viewport.
- **List and detail:** Align navigation and list item baselines. Use a flexible detail area and switch to sequential views when parallel panes stop fitting. Preserve selection and scroll context.
- **Dashboard or table:** Size the work area to its data. Set a minimum useful column width and let diagrams or numeric grids adapt where the content needs it.

## Optional starter assets

- [CSS tokens](../assets/design-system-core.css) define an example palette and scale. Import or copy selected declarations. Apply `.ux-prototype` to the chosen root for opt-in canvas, font and box sizing, and `.ux-prose` to a reading column inside it. Set the page's own margin and component styles explicitly. Ordinary headings, paragraphs, and native control styles keep their existing defaults unless the product styles them.
- [Tailwind v3 JavaScript template](../assets/tailwind.config.template.js) keeps the sample legacy mappings. Merge only needed fields with your project's config and keep the project's content paths. The example overrides several standard utility sizes. Existing users who rely on its numeric aliases can keep the mapping, while other projects can keep their own spacing scale.
- [Tailwind v4 CSS template](../assets/tailwind-v4.template.css) uses CSS theme aliases with a prefix. Import it from the app's main stylesheet and adapt it to the current design system. For a v3 migration, v4 loads a legacy JavaScript config only through explicit `@config`. [Tailwind theme variables](https://tailwindcss.com/docs/theme), [v4 migration guide](https://tailwindcss.com/docs/upgrade-guide#using-a-javascript-config-file)
