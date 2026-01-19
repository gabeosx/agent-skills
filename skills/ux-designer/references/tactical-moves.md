# Tactical UI Moves (Refactoring UI)

Follow these "shortcuts" to improve any UI instantly:

## 1. Hierarchy & Attention
- **De-emphasize first:** Before making something "pop" (more color, bigger font), try de-emphasizing the elements around it. Turn secondary text from black to gray.
- **Ditch the labels:** If the data is self-explanatory (e.g., an email address or a price), don't add a "Email:" label. Use the format to convey meaning.
- **Labels are secondary:** If you must use labels, make them small, uppercase, and high-contrast gray to distinguish them from the data.

## 2. Layout & Spacing
- **Start with the feature:** Don't design the navbar first. Design the actual dashboard widget or the form, then figure out where it lives.
- **Don't use borders for everything:**
  - Use subtle background colors to separate sections.
  - Use shadows to indicate depth.
  - Use whitespace as the primary separator.
- **Shrink your containers:** Most web apps are too wide. Limit the max-width of your content area to keep things from feeling sparse.

## 3. Color & Depth
- **Accent with color:** Use your brand color for the "Primary Action" and maybe a few small accents (icons, active nav states). Don't use it for large background blocks unless necessary.
- **Overlap shadows:** To make an element look like it's "floating" higher (like a modal), use two shadows: one large and soft for ambient light, one smaller and tighter for the edge.
- **Grays are not neutral:** Give your grays a tiny bit of saturation from your primary brand color to make the UI feel "connected" rather than cold.

## 4. Components
- **Buttons have a hierarchy:**
  - **Primary:** High-contrast background (Solid).
  - **Secondary:** Outline or light background.
  - **Tertiary:** Just text (Ghost).
- **Forms:**
  - Put labels on top of fields for better scannability.
  - Group related fields (e.g., Name/Email) together with a heading.
  - Make buttons the same width as the input fields on small screens.

## 5. Micro-Alignment & Details
- **Icons need alignment:** When placing an icon (or emoji) next to text, they will rarely align on the baseline naturally. Always use a Flex container with `align-items: center`.
- **Optical balancing:** Icons often need to be slightly larger than the text or nudged up 1px to feel centered.
- **Separate meta-data:** When listing small bits of info (e.g., "Date • Category • Author"), don't rely on whitespace alone. Use a visual separator (bullet `•` or pipe `|`) or distinct background badges to ensure the groups are distinct.
