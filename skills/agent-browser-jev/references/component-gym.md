# Component gym

The component gym is a deterministic local browser suite for the interaction patterns agents meet across modern web applications. It uses original, dependency-free fixtures rather than loading third-party demos, so runs remain offline except for Jev decisions and are not coupled to a framework release or public website uptime.

## Source inventories

The case selection is derived from current primary catalogs and standards:

- [WAI-ARIA Authoring Practices patterns](https://www.w3.org/WAI/ARIA/apg/patterns/) defines the semantic and keyboard expectations for accordion, alert dialog, carousel, checkbox, combobox, dialog, grid, listbox, menu, radio, slider, spinbutton, switch, tabs, tree view and related patterns.
- [Base UI components](https://base-ui.com/react/components) and [Radix Primitives](https://www.radix-ui.com/primitives) represent common headless-library compositions such as nested menus, custom selects, popovers, drawers, command palettes and async overlays.
- [MUI's component inventory](https://mui.com/material-ui/all-components/) supplies a broad application taxonomy across inputs, data display, feedback, surfaces and navigation.
- [shadcn/ui's component inventory](https://ui.shadcn.com/docs/components) adds common application assemblies such as data tables, date pickers, drawers, pagination, steppers, toasts and toggle groups.

These sources choose what to test; their implementation code is not copied or shipped.

## Coverage

`npm run gym:components -- --output /absolute/path/to/new-report.json` runs 26 cases with real Jev decisions, a real agent-browser session, server-side event verification and final accessibility snapshots.

| Family | Covered patterns |
| --- | --- |
| Disclosure | Accordion expansion and a nested action |
| Menus | Dropdown menu and nested submenu |
| Overlays | Form dialog, alert dialog, command palette, popover, drawer and hover card |
| Selection | Radio group, switch, toggle group, custom select, multi-select listbox, tri-state checkbox and rating |
| Navigation | Tabs, pagination, carousel and breadcrumb traversal |
| Data | Sortable table and tree view |
| Input/workflow | Spinbutton, exact-path file upload and a multi-step form with exact caller values |
| Feedback | Delayed status/toast completion |
| Boundaries | An absent target must hand back without side effects |

Each positive case emits exactly one server-side completion record containing its final structured state. A model completion flag alone cannot pass. The absent-target case passes only when Jev hands back and the server records no completion. Upload uses a temporary synthetic PDF that is deleted with the runner's private directory.

Use `--cases accordion,tabs` to run a subset. The aggregate `npm run gym` includes this suite once per report; other repeatable suites still honor `--rounds`.
