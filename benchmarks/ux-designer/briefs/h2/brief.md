# Switchyard Pantry packaging proof

Create a focused proofing workspace for a small food brand's production team. The current assignment is the front of the **Blood Orange pouch**, job **SP-0264**, 120 × 180 mm. A production reviewer needs to examine supplied artwork, consult proof notes, and approve the current version. Use a compact professional tool interface with an ink-colored or charcoal canvas surround and a warm, light review pane. Let the original illustration and typographic treatment in the supplied proof carry the color.

## Starting files and delivery

The starter directory contains two original illustrations, `artwork/proof-v3.svg` and `artwork/proof-v2.svg`. Use them as the actual proofs at their original aspect ratio. Deliver an offline, self-contained `index.html` with any other files stored locally. Each fresh page load shows Version 3, pins on, the thread list open, no active note, and status **In review**. Actions affect the current page only.

## Exact fixture content

| Version | Metadata | Notes |
| --- | --- | --- |
| Version 3 | Current proof · November 19, 2026 | Two open notes listed below |
| Version 2 | Earlier proof · November 17, 2026 | No open notes on this version |

Display the artwork in a central viewing area, with a visually quieter toolbar for version switching and pin visibility. The review area lists notes with readable author and title, shows the current review status, and provides approval access. Use the following Version 3 notes in order. Coordinates are percentages of the whole SVG viewport, including the transparent margins, so the pins follow the artwork as it scales.

| Pin | Position from top-left | Note title | Author | Message |
| --- | --- | --- | --- | --- |
| 1 | 68% x, 39% y | Leaf contrast | Inez Park | Check the leaf against the orange field on matte stock. |
| 2 | 58% x, 84% y | Net weight | Devin Cole | Keep the revised 60 g line centered under DRIED SLICES. |

## Behavior

1. A labeled native select switches the proof image and metadata immediately. Use option values `v3` and `v2`. Version 2 shows **No open notes on this version.** and has no pins or approval action. Switching back restores Version 3 and its note list. Preserve the pin visibility setting across version changes.
2. A **Show pins** toggle with a pressed state controls whether the artwork displays pins. It does not hide the note list. Clicking a pin or matching list item opens its note in the review pane with its title, author, and exact message. Selected pins and list items should have a distinct state. Provide a **Back to notes** control that closes the note and returns to the list. A small reply form adds the typed text to the active thread as **You** and clears the field. Replies remain within their own note for the current page session.
3. **Approve proof** opens a confirmation dialog for Version 3. The dialog identifies the job and version and has **Cancel** and **Confirm approval** controls. Cancel closes it without changing status. Confirm closes the dialog, updates the review status to **Approved**, and removes the approval action for the current page session. Escape closes the dialog as Cancel would.

## Layout acceptance

- At **1440 px**, use a short job header across the workspace, a large artwork canvas, and a right review pane with enough width for note titles and messages. Keep the complete proof and both pins visible together in the initial desktop view. The canvas should feel like a proofing surface with room around the physical artwork.
- At **834 px**, keep canvas and review pane adjacent, allow the toolbar to wrap, and keep proof pins accurately positioned. Both columns should remain usable without horizontal scrolling.
- At **390 px**, stack the canvas and review area. Keep the full artwork width visible with reasonably sized pin targets. Activating a pin should bring its opened note into view. The confirmation dialog must fit the screen.
- Clearly label icon controls, preserve visible keyboard focus, and maintain a readable distinction between controls, artwork, annotations, and review status.

## Stable test hooks

Set these exact `data-testid` values on the corresponding DOM elements. The proof is an image with the indicated exact alt text.

| Hook | Element |
| --- | --- |
| `version-select` | Native select, option values `v3` and `v2` |
| `version-meta` | Current version metadata |
| `proof-image` | Image with `alt="Blood Orange pouch, Version 3"` or `alt="Blood Orange pouch, Version 2"` |
| `pins-toggle` | Native button, `aria-pressed="true"` when pins are shown and `aria-pressed="false"` when hidden |
| `pin-1`, `pin-2` | Pin buttons on the artwork |
| `note-1`, `note-2` | Note buttons in the list |
| `notes-empty` | Version 2 empty notes message |
| `active-note` | Open note detail region, including replies |
| `back-to-notes` | Back to notes button |
| `reply-input` | Labeled reply text field |
| `post-reply` | Reply submit button |
| `review-status` | Status text |
| `approve-proof` | Opens the approval dialog |
| `approval-dialog` | Approval dialog |
| `cancel-approval` | Cancel button |
| `confirm-approval` | Confirm approval button |
