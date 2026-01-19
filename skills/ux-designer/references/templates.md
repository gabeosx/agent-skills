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

Use this markdown structure for your final output:

```markdown
# Design Spec: [Feature Name]

## 1. Design Brief
- **Users:** [Target Audience]
- **Primary Goal:** [Main Objective]
- **Primary Action:** [Label of main button]
- **Constraints:** [Tech/Brand constraints]

## 2. Information Architecture
- **Entities:**
  - [Entity Name]: [Field 1], [Field 2]...
- **Navigation Model:** [Description]

## 3. Visual System Summary
- **Spacing Scale:** [e.g., 4, 8, 16, 24, 32...]
- **Type Scale:** [e.g., 14, 16, 20, 24, 30...]
- **Color Strategy:** [Brief description of palette]

## 4. Component Inventory
### [Component Name]
- **Purpose:** [Description]
- **States:** Default, Hover, [Other]
- **Variants:** [List]

## 5. Screen Specs
### Screen: [Name]
- **Purpose:** [What user does here]
- **Layout:** [Grid/Stack description]
- **Key Components:**
  1. [Component A]
  2. [Component B]
- **Responsive:** [Mobile behavior]
- **State Handling:**
  - **Loading:** [Skeleton/Spinner]
  - **Error:** [Message/Retry]
  - **Empty:** [CTA]

## 6. Accessibility Checklist
- [ ] Contrast ratios met (AA)
- [ ] Keyboard navigable (Focus rings)
- [ ] Touch targets > 44px
- [ ] Form labels explicit

---

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
