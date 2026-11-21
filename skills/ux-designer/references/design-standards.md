# Visual system

## Spacing and sizing

Start with enough space to see the groups, then remove space where side-by-side comparison, speed or available height demands it. Keep a label and its value closer than adjacent field groups. Shared edges and steady row rhythm often group related content more clearly than another surrounding card. Use a divider when two adjacent items genuinely need a boundary.

Choose a local spacing rhythm such as 4, 8, 12, 16, 24, 32, 48 and 64. Extend it for repeated needs and allow an optical nudge, responsive dimension or one-off asset crop where purposeful. Choose the width of a reading column, form, chart or table independently of the outer layout. Let the content determine when the layout changes. Use min-height for controls whose labels may wrap or grow with text scaling.

## Typography

Try the actual headline, supporting line, long item name, field label and representative number together. Choose a face with clear glyphs in the sizes and weights the UI will use. Pair a display face with a quieter text face when the contrast supports the personality. One well-chosen family can do both jobs. Keep a reliable fallback and control layout shift if fonts load late.

- Start from body and control text, then define display, heading, label and metadata roles. Keep a noticeable step between the page title, section title and labels using size, weight or contrast. Use a regular body face and moderate weight for most supporting controls. Reserve very heavy or condensed type for a role that earns the attention. Rough type steps such as 13, 15, 17, 22, 28, 36 and 48 are a starting point. Use relative units and allow readable variation across widths.
- Give body text a comfortable measure, often about 45–75 characters per line. Use more leading for long or small text and tighter leading for display text. Check actual wraps, ascenders and descenders.
- Align mixed text sizes by baseline when they share a line. Optically align icons with the surrounding glyphs. Start from the face’s own spacing. Adjust headlines in small increments, checking word spaces and dark gaps at each width. Leave running and control text close to its natural tracking. Use extra tracking sparingly for short uppercase labels that earn their place.
- Use tabular digits and consistent precision for comparable values. Right-align numeric columns, and place units consistently so magnitudes are easy to scan. Keep real inline links identifiable in prose.

## Color

Start from the roles the interface needs. Pick a neutral ink and canvas, a dominant accent suitable for the key action, and feedback hues suited to the meanings in the product. Choose the useful middle shade and the light and dark endpoints of each family. Fill intermediate shades where a border, hover, surface tint or supporting foreground needs them.

Use HSL or OKLCH to reason about hue, lightness and chroma. Adjust endpoints by eye, then measure the final rendered pairs. Neutrals may have a small warm or cool tint. On a colored surface, choose a readable related foreground with enough contrast to retain its quiet role. If a saturated badge competes for attention, test darker text on a pale tint for that role.

- Check text/canvas, text/surface, muted text, link, status, on-action, hover and focus pairs. WCAG AA uses 4.5:1 for typical text, 3:1 for qualifying large text and 3:1 for applicable non-text controls and state indicators. Test focus against adjacent surfaces and account for compositing. Provide a text label, shape or position when color carries meaning.
- Give status text, status surface and control boundaries their own roles. A subtle separator can be lower contrast when it conveys no essential state or boundary. Define dark theme pairs deliberately when the product has a dark theme.
- Name repeated values by their purpose. An optional example lives in [the prototype tokens](../assets/design-system-core.css). Choose the palette for the actual product.

## Depth

Establish the visible surface order using background tone, subtle edges, overlap and shadow as needed. Keep the virtual light direction consistent. A compact edge shadow and a softer ambient shadow can distinguish a raised surface. Use different elevation treatments only when they clarify relationships or interaction. Check that sticky elements, dialogs, badges and focus rings fit their scroll context without clipping or hiding content.

Sources for the design techniques. [Book inventory and examples](https://refactoringui.com/), [type leading preview](https://refactoringui.com/previews/line-height-is-proportional/), [palette preview](https://refactoringui.com/previews/building-your-color-palette), [contrast requirements](https://www.w3.org/TR/WCAG22/)
