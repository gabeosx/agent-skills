# Fieldmark contractor inspection request

Build a three-step request flow for Fieldmark, used by facilities teams to book a contractor to inspect one location. The requester needs to know what remains, fix an error in place, and review the request before local submission.

1. Site details: Site name and Contact email, both required, with validation on Continue. Invalid email leaves step one active and shows a visible field-specific error. Use "Harbor Annex" and "ops@example.test" as test inputs, without pre-filling them.
2. Inspection: Property system, with Electrical and HVAC as choices. Show an optional access notes field. Back returns to site details with values intact. Continue reaches review only with a system selected.
3. Review: show submitted site name, email, selected system and access notes if entered. Back enables edits without clearing data. Confirm request yields an accessible success view with "Inspection requested" and reference "FM-2047". No backend and no real provisioning.

Make current step and required inputs clear; preserve useful space on 1440, 834 and 390 CSS px, including at least one usable narrow-screen validation state. Use appropriate labels and keyboard navigation.

Stable hooks: site-name, email, email-error, next (active step's Continue), back (active step's Back), system (native select values empty, electrical, hvac), notes, review, confirm, success. Empty starting directory.
