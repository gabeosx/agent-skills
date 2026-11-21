# Olfacto Studio wholesale landing page

Build a landing page for Olfacto Studio, a niche fragrance intelligence platform. Independent perfume retailers use it to compare how a new collection fits their assortment before they commit to buy. The primary conversion is requesting a wholesale preview. The reference audience is premium, practical buyers who need concrete evidence before booking.

Use this exact content as your data, choosing appropriate hierarchy and layout:

- Brand: Olfacto Studio. Proposition: "Build an assortment with a point of view." Product proof: 480 independent fragrance houses, 32 markets, updated weekly.
- "Explore the sample" is the secondary action. Show three real sample collection rows with name, scent family and suggested retail range: Resin Library / Woods & resins / $92–128, Drift Notes / Marine & mineral / $86–120, Aftergold / Amber & spice / $110–160. Give this evidence an intentional visual treatment.
- "Request preview" opens a local form with a labeled Work email input. Submitting an invalid email keeps the form open and shows a visible error. Submitting a valid email shows "Preview requested" and the submitted email. A close button dismisses the form. No backend or external navigation.
- Secondary action scrolls to or reveals the collection sample where the rows are readable. Give visitors enough information to understand what they are requesting, without inventing client endorsements or fake credentials.
- At 1440, 834 and 390 CSS px preserve the proposition, sample evidence and conversion path. Mobile should not bury the conversion path behind a menu.

Stable hooks: request (primary trigger), sample-link, sample, email, submit, email-error, success, close. Use one instance of each hook. Empty starting directory.
