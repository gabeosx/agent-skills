# Interaction patterns

## Dense workspaces and comparisons

Choose the user decision first: scan, compare, find an exception, or act on a record. Keep active scope, filters and units close to their result. Make charts answer a specific question with labeled axes, useful scale and a text or table equivalent. Use a short trend or summary to direct attention to action rather than adding more panels.

Use semantic tables when row/column relationships matter. Put the lookup label where scanning starts and the first decisive value nearby. Compare numeric values on aligned baselines. Use modest row separators, restrained exception cues and an action with a clear target. Reserve space for expansion, longer data and new states.

At narrow widths prioritize visible labels and decisive values. Keep table scrolling internal when the axes matter and show that more columns are available. If needed make the row heading sticky and the region keyboard-accessible. For record-by-record work, adapt a row to a compact labeled stack. Keep a way to reach lower-priority data and preserve sorting/filtering decisions.

## Navigation and controls

Use navigation patterns supported by the amount of content and the number of real destinations. Preserve current location and main destinations when converting a sidebar, menu or secondary navigation to a disclosure. Keep context when revealing details. Test keyboard opening, dismissal and focus restoration for dialogs and menus. Close or reconcile overlays when navigation changes context.

Use real buttons for actions and links for destinations. Keep native inputs where they meet the interaction, with clear labels and visible hover, focus and state cues. Provide an adequately sized pointer target or spacing, especially on touch. Use a larger hit area than the visible icon when needed. Preserve visible focus in the design system.


For text-rich buttons and links, use the visible contents as the native accessible name by default. Use `aria-labelledby` when you need to reference a visible label outside the control. If overriding the name, preserve the complete visible label in its rendered order, preferably at the start of the name. Avoid rebuilding it from differently ordered data fields. Keep supplemental details in nearby text or associate them with `aria-describedby` when the design separates them from the label. Inspect the computed name in the browser after responsive or state changes. An automated label-in-name check can catch a mismatch that click and keyboard tests miss.

## Forms and states

Group the minimum fields needed at each step. Show meaningful progress and give a clear next action. Preserve inputs on navigation and validation. Link each error to its field, move focus when appropriate and let a user correct one error without losing the rest of the work. When focus and error overlap, make focus location and the error message clear with a coordinated treatment. Keep progress secondary to the active step and rebalance the screen when the task is complete. Use explicit review or confirmation for important submissions, with an actionable success state or next step.

For async data, scope feedback to the affected region. Show progress, a useful empty state, error recovery and a reason when a necessary action is disabled. Make changed state perceivable without color alone. Guard against duplicate submissions when the underlying operation needs it.
