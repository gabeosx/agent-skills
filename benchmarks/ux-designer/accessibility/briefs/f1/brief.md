# Northbank Tramway shift handover

Build a self-contained handover screen for a tram operations coordinator reviewing open fault reports from the morning shift. The coordinator should be able to pick a report at a glance, then read the notes needed for the next shift. Use only the fictional data below. The page must work offline with no external assets, network calls, or actions outside the page.

## Report queue

Show these three reports in the order given.

| Report | Location | Reported fault | Logged | Status |
| --- | --- | --- | --- | --- |
| T-214 | Alder Junction | Signal lamp reported dim | 06:40 | Follow-up due |
| T-219 | Quay Loop | Platform display froze | 07:15 | Assigned |
| T-224 | Cedar Depot | Door sensor intermittent | 08:05 | Ready to review |

Each report is a single native button presented as a multi-part card. Keep the report number, location, reported fault, logged time, and status visible within the clickable area. Provide visible labels for the fields where a value alone is ambiguous, including logged time and status. The entire card should select its report. Give the buttons useful pointer hover and keyboard focus states, and make the currently selected report apparent without relying on color alone.

## Selected report

Open with T-214 selected. Show only the selected report in the detail area, including the location, report number, and these handover fields. Selecting another card updates the detail area in place.

| Report | Assigned crew | Next action |
| --- | --- | --- |
| T-214 | Wayside team | Check the signal lamp during the next service gap. |
| T-219 | Passenger information team | Confirm the replacement display cycles through all destinations. |
| T-224 | Fleet maintenance team | Review the door sensor history before releasing the tram. |

## Layout

Support viewport widths of 1440, 834, and 390 CSS px. Place the report queue alongside the detail area on wide screens and stack the queue before the selected report on mobile. Keep the queue and detail area readable at 834 px. Allow text to wrap and keep the page free of horizontal scrolling at 390 px.

## Verification hooks

Use the following `data-testid` values exactly once each. Keep each hook on the element described.

| Hook | Element |
| --- | --- |
| `handover-report-t214` | Report button for T-214 |
| `handover-report-t219` | Report button for T-219 |
| `handover-report-t224` | Report button for T-224 |
| `handover-detail-id` | Selected report number by itself |
| `handover-detail-location` | Selected location by itself |
| `handover-detail-crew` | Assigned crew value by itself |
| `handover-detail-next` | Next action value by itself |
