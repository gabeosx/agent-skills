# Design Templates & Schemas

## 1. Design Report Schema (The Data Model)

When analyzing a design request, structure your thinking using this schema:

### Design Brief
- **Users:** Who is this for?
- **Primary Goal:** What is the one thing they must achieve?
- **Primary Action:** The specific button/interaction that fulfills the goal.
- **Constraints:** Technical, Brand, or Platform limitations.

### Information Architecture
- **Entities:** Key data objects (User, Product, Order) and their visible fields.
- **Navigation:** How users move between screens.
- **Routes:** List of distinct views.

### Component Inventory
Define reusable UI parts:
- **Name:** Standard nomenclature (e.g., "UserCard").
- **Purpose:** When to use it.
- **States:** Default, Hover, Active, Disabled, Loading, Empty, Error.
- **Variants:** Primary, Secondary, etc.

### Visual System Specs
- **Spacing:** The used scale.
- **Typography:** The used sizes/weights.
- **Color:** Token mapping.

### Screen Specifications
For each screen:
- **Layout:** Zones (Header, Sidebar, Content).
- **Hierarchy:** What catches the eye 1st, 2nd, 3rd.
- **Responsive:** How it adapts to mobile.

---

## 2. Response Template (Copy & Paste)

Use this markdown structure for your final output. You MUST fill every section.

```markdown
# Design Spec: [Feature Name]

## 1. Design Brief
- **Users:** [Target Audience]
- **Primary Goal:** [Main Objective]
- **Primary Action:** [Label of main button]
- **Constraints:** [Tech/Brand constraints]
- **Assumptions:** [List any assumptions made if prompt was underspecified]

## 2. Information Architecture
- **Entities & Fields:**
  - [Entity Name]: [Field 1], [Field 2]...
- **Navigation Model:** [How users move here]
- **Routes:** [List of URLs/Views]

## 3. Visual System Summary
*Refer to `assets/design-system-core.css` for full tokens.*
- **Color Strategy:** [e.g., "Slate gray neutrals with Indigo primary actions"]
- **Elevation Layering:** [How z-depth is used]

## 4. Layout & Responsive Breakpoints
| Breakpoint | Width | Layout Behavior |
| :--- | :--- | :--- |
| **Mobile** | < 640px | [e.g., Stacked single column, hidden sidebar] |
| **Tablet** | 640px - 1024px | [e.g., 2-column, condensed nav] |
| **Desktop** | > 1024px | [e.g., 3-column, full sidebar] |

## 5. Component Inventory & State Matrix
*Define the behavior of every interactive element.*

| Component | State | Visual Change / Behavior |
| :--- | :--- | :--- |
| **[Name]** | Default | [Base appearance] |
| | Hover | [e.g., darken bg 10%] |
| | Active/Focus | [e.g., ring-2 ring-primary] |
| | Disabled | [e.g., opacity-50, no pointer] |
| | Loading | [e.g., internal spinner, fixed width] |
| | Error | [e.g., red border, message below] |
| | Empty | [e.g., "No items found" placeholder] |

*(Repeat for all key components)*

## 6. Screen Specifications
### Screen: [Name]
- **Purpose:** [What user does here]
- **Layout Structure:** [Grid/Stack details]
- **Key Hierarchy:**
  1. [Element A]
  2. [Element B]
  3. [Element C]
- **Detailed Layout Rules:**
  - [Rule 1: e.g., "Card grid fills available space, min-width 300px"]
  - [Rule 2]

## 7. Implementation Handoff
- [ ] **Tailwind Config:** Use `assets/tailwind.config.template.js` mapping.
- [ ] **CSS Tokens:** Use `assets/design-system-core.css`.
- **Assets Required:** [Icons, Images, Fonts]

## 8. Accessibility & QA Rubric (Must Pass)
- [ ] **Contrast:** All text meets WCAG AA (4.5:1).
- [ ] **Touch Targets:** Interactive areas are at least 44x44px.
- [ ] **Focus States:** Every interactive element has a visible `:focus` ring.
- [ ] **Semantic HTML:** Buttons are `<button>`, Links are `<a>`.
- [ ] **Labels:** Form inputs have visible labels or `aria-label`.
- [ ] **Overflow:** Verified no horizontal scroll on Mobile (320px).
- [ ] **State Check:** Error and Loading states defined for all forms/lists.
```
## 3. Standard Layout Patterns

### A. Pro App (3-Pane)
Use this for Email, SaaS, or Admin tools.
**Structure:** Sidebar (Nav) | Master List (Search/Filter) | Detail View (Content).

```css
body { overflow: hidden; /* Prevent body scroll */ }

.app-container {
  display: grid;
  grid-template-columns: 240px 320px 1fr; /* Fixed | Fixed | Fluid */
  height: 100vh;
  width: 100vw;
}

/* Individual Panes */
.pane {
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* Independent scrolling */
  border-right: 1px solid var(--color-border-subtle);
}
```

### B. Dashboard Grid (12-Column)
Use for Analytics or Home screens.

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); /* Responsive */
  gap: 24px;
  padding: 32px;
}

/* Spanning Utilities */
.col-span-2 { grid-column: span 2; }
.col-span-full { grid-column: 1 / -1; }
```

### C. Centered Single Column
Use for Settings, Profiles, or text-heavy pages.

```css
.container-sm {
  max-width: 640px;
  margin: 0 auto;
  padding: 48px 24px;
}
```
```
