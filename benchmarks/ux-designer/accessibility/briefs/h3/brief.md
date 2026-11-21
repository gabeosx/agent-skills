# Bridgeglass Community Radio studio bookings

Build the daily studio schedule used by Bridgeglass Community Radio's station coordinator. A coordinator needs to see when three spaces are booked, find tentative sessions, and move a booking without creating an overlap. Use **Bridgeglass Community Radio** and the screen title **Studio bookings**. This is an internal tool with repeated daily use. Make the time structure, room names, and booking status easy to compare at a glance.

## Starting files and delivery

Start in an empty directory. Deliver an offline, self-contained `index.html` with any other files stored locally. Use local fixture data only. Each fresh page load starts on Tuesday, November 24, 2026, with all bookings visible and no selection. Changes are retained while navigating between days or toggling the filter, then reset on a fresh page load.

## Schedule and fixture data

The date strip contains **Tue, Nov 24** and **Wed, Nov 25**. The studio day is **9:00 AM–1:00 PM**, all times local. Keep rooms in the order **Studio A**, **Studio B**, **Edit Booth**. Use the exact fixtures below. Dates refer to November 2026.

| Date | Room | Time | Booking | Host | Status |
| --- | --- | --- | --- | --- | --- |
| Tue 24 | Studio A | 9:00–9:45 AM | Morning Mix | Leah Srivastava | Confirmed |
| Tue 24 | Studio A | 10:00–11:00 AM | Signal Check | Mara Ortiz | Confirmed |
| Tue 24 | Studio A | 11:30 AM–12:30 PM | Midday Rotation | Minh Tran | Confirmed |
| Tue 24 | Studio B | 9:00–10:00 AM | Field Notes | Jonah Reed | Tentative |
| Tue 24 | Studio B | 10:30–11:15 AM | Studio Coaching | Elin Fischer | Confirmed |
| Tue 24 | Studio B | 12:00–12:45 PM | Volunteer Orientation | Eli Okafor | Tentative |
| Tue 24 | Edit Booth | 9:30–10:00 AM | Tape Transfer | Robin Hale | Confirmed |
| Tue 24 | Edit Booth | 11:00–11:45 AM | Promo Edit | Dalia Chen | Confirmed |
| Wed 25 | Studio A | 9:15–10:15 AM | Interview Pickup | Nina Flores | Confirmed |
| Wed 25 | Studio B | 10:00–11:00 AM | Show Prep | Samir Patel | Tentative |
| Wed 25 | Edit Booth | 11:30 AM–12:30 PM | Archive Cleanup | Robin Hale | Confirmed |

Use a restrained visual system with compact spacing and room for scanning the full schedule. Show tentative status using readable words and a visual treatment that differs from confirmed bookings. Keep title and time legible on booking cards, and make full host and status information available in the booking details. The grid can use quiet sub-hour lines to help users place 15-, 30-, and 45-minute offsets.

## Behavior

1. Both date controls switch the schedule and update the selected day. A **Tentative only** button filters the active day to Tentative bookings and has an accessible pressed state. The filter persists across day switches. Selecting a different day clears the booking details.
2. Clicking a booking opens a detail region or dialog with title, room, time, host, and status. Include a button to close the details and a **Move booking** action.
3. **Move booking** opens a labeled native destination select and a **Save move** control. Preserve the start and end times. Use destination values `studio-a`, `studio-b`, and `edit-booth` for the three room names. Show the current room as the initial choice. Reject a destination if another booking overlaps on the active date. A booking ending exactly as another begins is allowed. If the Tuesday **Signal Check** is moved to Studio B, show the exact conflict **Overlaps Studio Coaching in Studio B.** Leave the booking in Studio A while the conflict is displayed. Changing to an available room and saving moves the card immediately, updates the displayed room in its details, closes the move form, and provides status text **Booking moved to Edit Booth.** when the chosen destination is Edit Booth. Keep the booking selected after a successful move so the resulting room is easy to verify. A cancel control closes the move form and leaves the booking unchanged.

## Layout acceptance

- At **1440 px**, render a time grid with a fixed header row for the three room columns, an hour axis at the side, and booking cards aligned to their starts and durations. The full schedule from 9:00 AM to 1:00 PM should be visible in the initial desktop view. Use an adjacent panel or a dialog when opening booking details so users can still orient themselves to the schedule.
- At **834 px**, retain the three-column time grid and fit the room labels and booking titles without horizontal scrolling. Use a compact dialog or overlay for details if the grid needs the full width.
- At **390 px**, use a chronological agenda with the time, room, title, and status visible per booking. For ties, follow the room order above. Keep both date controls and the filter in reach above the list. Booking details and the move form must fit the screen.
- Expose clickable bookings as keyboard-operable controls. Update conflict and success text where it can be read without depending on a color change.

## Stable test hooks

Set these exact `data-testid` values on the corresponding DOM elements. Give every booking one visible card for the active responsive layout.

| Hook | Element |
| --- | --- |
| `day-tue`, `day-wed` | Date buttons with exact `aria-pressed="true"` for the active day and `aria-pressed="false"` for the other |
| `tentative-only` | Filter button with `aria-pressed="true"` when active and `aria-pressed="false"` otherwise |
| `booking` | One rendered wrapper per visible booking so the collection can be counted |
| `booking-signal-check`, `booking-field-notes`, `booking-interview-pickup`, `booking-show-prep` | Clickable cards inside their wrappers for the named fixtures. Preserve hooks when moving a booking |
| `booking-details` | Region or dialog containing the selected booking's room and details |
| `close-details` | Close detail button |
| `move-booking` | Button to open the move form |
| `move-form` | Move form |
| `destination-room` | Native destination select with the values listed above |
| `save-move`, `cancel-move` | Save and cancel controls within the form |
| `move-conflict` | Conflict message |
| `move-success` | Success message |
