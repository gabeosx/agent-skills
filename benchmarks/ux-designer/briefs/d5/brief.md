# Harborline dispatch queue refinement

Refine the supplied Harborline screen in the working directory. Harborline coordinates regional freight deliveries. Dispatchers pick out late stops and mark reviewed stops on a personal shift queue. The starter is the source of truth for content, delays, and current behavior. Preserve the working controls and the existing queue content. You can reorganize and restyle the page and make the existing handlers more accessible.

Keep the Late only filter, show two matching rows when active, restore all rows when inactive, and support acknowledgement for every visible row. Acknowledging Riverfront Market changes its display to "Reviewed" without changing its delay or hiding the stop. Filter status needs to be obvious. Preserve city, ETA, and delay, and avoid paging or navigation additions.

Design for widths 1440, 834 and 390 CSS px. The mobile operator needs quick access to the filter and stop review. Keep the key dispatch information readable under realistic density.

Stable hooks from the starter: late-only, stops, riverfront-review, riverfront-state, oak. Starter directory contains index.html and includes intentionally weak layout and semantics.
