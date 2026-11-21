# Carrick Museum loan review

Build a loan disposition screen for a museum registrar deciding whether an incoming artwork can move from intake to the gallery. Show the artwork title **Blue Tide, 1976**, loan ID **CM-L018**, lender **West March Print Archive**, and the intake finding **The transit case humidity log is missing its final reading.** The page must work offline, with local demonstration behavior only. Do not use network calls, external assets, messages, or integrations.

## Decisions

Show these three decisions in the order given.

| Decision | Handling | Follow-up |
| --- | --- | --- |
| Approve installation | Release to the gallery | None |
| Request a condition update | Keep in the intake area | Registrar review |
| Place loan on hold | Move to secure storage | Supervisor review |

Each decision is a single native button with the decision title and both labeled data rows visible within its clickable area. The full surface should select the decision. Provide useful hover and keyboard focus states and make the selection apparent without relying on color alone.

## Record the decision

Default to **Approve installation** and show the current choice in the review area. Changing options updates the current choice without recording anything. Provide a labeled **Registrar note** field and a **Record decision** button. A note is optional for approval and required for either of the other two decisions. Show which rule applies next to the field. Keep the decision button available so the registrar can submit and see the note validation. If the note is required and empty or whitespace-only on submit, show **Enter a registrar note to record this decision.** Leave the chosen option selected so the registrar can add the note and try again.

Start without a confirmation. After a valid submission, clear any validation message and show the confirmation in the page. Use the corresponding message exactly as written below. If a note was provided with the decision, show it with the confirmation so the registrar can verify what was recorded.

| Decision | Confirmation |
| --- | --- |
| Approve installation | Installation approved |
| Request a condition update | Condition update requested |
| Place loan on hold | Loan placed on hold |

## Layout

Support viewport widths of 1440, 834, and 390 CSS px. On desktop, make it easy to scan all three decisions side by side. At smaller widths, reflow the decision buttons while keeping their labels and values visible. On mobile, place the decisions before the review area and keep the note field and record action readable without horizontal scrolling.

## Verification hooks

Use the following `data-testid` values on the described elements. Render at most one element for each hook and keep the note error, confirmation, and recorded note visible only when applicable.

| Hook | Element |
| --- | --- |
| `loan-option-approve` | Decision button for Approve installation |
| `loan-option-update` | Decision button for Request a condition update |
| `loan-option-hold` | Decision button for Place loan on hold |
| `loan-current-choice` | Currently selected decision title by itself |
| `loan-registrar-note` | Fillable Registrar note field |
| `loan-record-decision` | Record decision button |
| `loan-note-error` | Registrar note error message by itself |
| `loan-confirmation` | Confirmation message by itself |
| `loan-recorded-note` | Recorded note text by itself |
