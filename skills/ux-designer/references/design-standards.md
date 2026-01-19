# Design Standards & Visual System

## 1. Spacing System
**Rule:** Use a fixed scale to avoid "pixel-pushing."

**The Scale:**
- `2, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256` (px)

**Tactical Rules:**
- **Grouping:** Use spacing to group related elements. The space *between* groups should be significantly larger than the space *within* a group.
- **Remove borders:** Before adding a border to separate sections, try adding more whitespace first.
- **Padding:** Use generous padding for "hero" sections and modals to make them feel premium.

## 2. Typography System
**Rule:** Use a limited set of sizes to establish hierarchy.

**The Scale:**
- `12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72` (px)

**Refactoring UI Moves:**
- **Hierarchy through contrast:** Don't just make text bigger to make it more important. Try making the *other* text smaller, lighter in weight, or lighter in color (gray).
- **Avoid "Gray Opacity":** On colored backgrounds, don't use white with opacity for secondary text (it looks washed out). Pick a hand-selected lighter shade of the background color.
- **Limit line length:** For readability, keep body text containers between 45–75 characters wide.

## 3. Color System
**Rule:** Maintain hue discipline. Ensure WCAG AA contrast.

**Palette Structure:**
- **Neutrals:**
  - `text.primary`: Near-black (e.g., #111827)
  - `text.secondary`: Mid-gray (e.g., #6B7280)
  - `text.tertiary`: Light-gray (e.g., #9CA3AF)
  - `bg.canvas`: Page background (e.g., #F9FAFB)
  - `bg.surface`: Card/Modal background (e.g., #FFFFFF)
  - `border.subtle`: Light borders (e.g., #E5E7EB)
- **Primary Action:**
  - `action.bg`: Brand color
  - `action.text`: White or high-contrast
- **Feedback:**
  - `danger`: Destructive actions (Red)
  - `success`: Completion/Good (Green)
  - `warning`: Attention needed (Yellow/Orange)

**Dark Mode Strategy:**
- Flip to "Light text on Dark background".
- Do not use pure black (#000000) for backgrounds; use dark grays (#121212).

## 4. Elevation & Depth
**Rule:** Shadows encode elevation/z-index. Do not decorate.

**Elevation Clearance:**
- **Padding Formula:** If a component extends outside its bounds (e.g., `transform: translateY(-4px)` + `top: -8px` badge), the container MUST have padding > sum of extensions.
  - *Example:* 12px extension → Use `pt-4` (16px) or `pt-6` (24px).
- **Z-Index:** Explicitly define z-index layers for elevated elements to ensure they don't slide *under* headers or sidebars.

**Levels:**
- **Level 0 (Flat):** Base content, cards on canvas (if bordered).
- **Level 1 (Raised):** Hover states, small dropdowns.
- **Level 2 (Overlay):** Dropdowns, popovers, sticky headers.
- **Level 3 (Modal):** Dialogs, drawers.
- **Level 4 (Toast):** Notifications, critical alerts.

**Shadow Composition:**
- Use "Two-part" shadows:
  1. **Ambient:** Soft, large spread, low opacity (adds depth).
  2. **Key:** Sharp, vertical offset, higher opacity (defines edge).

## 5. Imagery
- **Quality:** No low-res placeholders.
- **Contrast:** When placing text on images, use scrims (overlays) or soft shadows to guarantee readability.

## 6. Responsive Behavior
**Rule:** Large elements compress faster than small ones.

- **Typography:** Scale down headers significantly on mobile; body text stays ~16px.
- **Padding:** Reduce section padding (e.g., 64px → 24px).
- **Layout:**
  - Desktop: Multi-column.
  - Mobile: Single column (stack).
- **Touch:** Minimum tap target 44x44px.
