# Atlas Works service documentation

Build a responsive documentation interface for facilities supervisors using Atlas Works to restore a pump after a routine loss of prime. Supervisors in the field need the procedure and the safety callout; at a desk they also browse a sizable docs hierarchy.

The article starts with "Restore prime" and a one-sentence summary. Provide these sections with visible headings, real content and anchored in-page navigation:
- "Isolate the pump": switch it off, apply site lockout procedure, verify zero energy.
- "Refill the chamber": open the fill port, add approved priming fluid until full, and close the port.
- "Verify flow": clear the work area, follow site restart procedure, and confirm flow on the gauge. If flow does not recover, stop and notify maintenance.

Show a prominent safety notice: "Do not run the pump dry." The docs categories are Start here, Equipment, Procedures, and Troubleshooting. Equipment expands to Centrifugal pump and Dosing skid. Procedures has Restore prime (current), Replace a seal, and Check flow. Supporting article links can open short, local context panels; avoid dead destinations. The main navigation must be reachable on 390px. On desktop show the docs navigation and the page outline, and maintain readable prose measure. Select the small-screen navigation pattern and keep the three sections reachable. Verify at 1440, 834 and 390 CSS px.

Stable hooks: nav-toggle (mobile), docs-nav, equipment-toggle (true/false aria-expanded), equipment-links, jump-verify and verify. Empty starting directory.
