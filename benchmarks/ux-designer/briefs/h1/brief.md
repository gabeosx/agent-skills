# Briar Harbor streetlight service

Build the public reporting page for Briar Harbor's municipal light service. A resident arriving after dark knows roughly where a light is and wants to find the pole, see if a crew already knows about it, and submit a short report if necessary. Use the name **Briar Harbor Public Works** and page title **Report a streetlight outage**. Explain that the service tracks lights on public streets. Use the exact neighborhood and pole records below. Treat them as fixtures for a fictional town.

## Starting files and delivery

Start in an empty directory. Deliver an offline, self-contained `index.html` with any support files stored locally. Use HTML, CSS, and JavaScript. Each new page load starts with the full list, no pole selected, and no report filed. All actions affect the current page only.

## Content and presentation

Create a civic utility page with a clear town identity, a short introductory block, and a task area. A resident should be able to compare similar addresses quickly. Give the pole code, street address, nearby landmark, and reporting state distinct visual weight. Use a warm neutral background, a deep blue or charcoal text color, and a restrained warm highlight to suggest a light after dark. Show status words alongside any color or icon.

| Pole | Address | Landmark | Initial state |
| --- | --- | --- | --- |
| BH-1042 | 18 Wren Avenue | Across from Wren Library | Available to report |
| BH-1067 | 76 Wren Avenue | Outside Harbor Market | Crew notified |
| BH-2014 | 9 Mariner Lane | Beside the east park gate | Available to report |
| BH-2079 | 61 Mariner Lane | At the pedestrian crossing | Available to report |

The service area is **East Basin**. The existing report for BH-1067 was logged **November 18, 2026** with reference **SL-5826** and state **Crew notified**. Beneath the task area, include a compact explanation that the pole code is printed on a small tag facing the street. The page should read as one service, with a working search and report flow.

## Behavior

1. Search the four pole records with one labeled input. Match case-insensitive substrings across pole code, street address, and landmark without requiring submission. Show a result count and the exact empty message **No streetlights match this search.** Clearing the input restores the full list. Keep the pole order from the table.
2. Selecting a pole shows its address and landmark in the adjacent report area. Use a genuine selected state on the chosen result. For BH-1067, show the existing report date and reference. For an available pole, show a labeled issue select with **Light is out** (value `out`, default), **Light flickers** (value `flicker`), and **Light stays on during the day** (value `daytime`). Show a labeled optional notes field and a **Submit report** button only for an available selected pole.
3. Submitting replaces the form with an acknowledgment headed **Report submitted**. It contains the new reference **SL-5842**, the selected pole code, and the selected issue's full display label. A **Report another light** button returns to the fresh page state. No network request or persistence is needed.

## Layout acceptance

- At **1440 px**, use a centered content area and a balanced two-column working area. Keep the list and its corresponding report panel aligned at the top. Show all four pole rows in the initial desktop view.
- At **834 px**, preserve side-by-side search and report areas. Allow address and landmark text to wrap and retain clear targets for all four results.
- At **390 px**, stack the search results and report region in that order. Avoid horizontal scrolling and ensure selected details, form, and acknowledgment fit the width. Keep results and form controls all comfortably touchable.
- Make controls keyboard operable, use associated form labels, and expose status changes as text. The 1440, 834, and 390 px layouts should each feel complete.

## Stable test hooks

Set these exact `data-testid` values on the corresponding DOM elements. Each result is a clickable native button. The search's empty message, the report detail, and the confirmation are readable text.

| Hook | Element |
| --- | --- |
| `pole-search` | Search input |
| `result-count` | Result count, including the number |
| `pole-BH-1042`, `pole-BH-1067`, `pole-BH-2014`, `pole-BH-2079` | Fixture result buttons, each with `aria-pressed="true"` when selected and `aria-pressed="false"` otherwise |
| `no-results` | Empty search message |
| `pole-detail` | Selected pole's detail region including existing report information when applicable |
| `issue-type` | Native select, option values as specified above |
| `report-notes` | Optional notes field |
| `submit-report` | Submit report button |
| `confirmation` | Acknowledgment containing heading, code, reference, and selected issue label |
| `report-another` | Reset button shown in the acknowledgment |
