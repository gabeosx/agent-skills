# Design Templates and Schemas

## 1. Design Report Schema (Data Model)

Use this schema to structure analysis and output.

### Design Intent Declaration (required)
- Primary user goal
- Primary UX constraint (speed/clarity/density/guidance/trust)
- Risk tolerance (minimal change vs expressive UI)
- Environmental constraints (internal tool/public SaaS/regulated)

### Design Brief
- Users
- Primary Goal
- Primary Action
- Constraints
- Output Mode
- Density Mode

### Information Architecture
- Entities and visible fields
- Navigation model
- Routes/views

### Component Inventory
- Component name and purpose
- Variants
- Full state matrix requirements

### Visual System
- Spacing/type/color/elevation mapping
- Anti-generic rationale for conventional patterns
- Motion behavior

### Validation
- Hierarchy Audit
- Edge Case Simulation
- Consistency Check

---

## 2. Full UX Spec Template (default)

Use this structure for full outputs.

```markdown
# Design Spec: [Feature Name]

## 0. Design Intent Declaration
- **Primary user goal:** [Goal]
- **Primary UX constraint:** [speed/clarity/density/guidance/trust]
- **Risk tolerance:** [minimal change vs expressive UI]
- **Environmental constraints:** [internal/public/regulated]

## 1. Design Brief
- **Users:** [Audience]
- **Primary Goal:** [Main objective]
- **Primary Action:** [Main CTA]
- **Constraints:** [Tech/Brand/Platform]
- **Output Mode:** Full UX spec
- **Density Mode:** [Compact/Balanced/Spacious]
- **Assumptions:** [If prompt is underspecified]

## 2. Information Architecture
- **Entities and Fields:**
  - [Entity]: [Field1], [Field2]
- **Navigation Model:** [Flow]
- **Routes:** [URLs or views]

## 3. Visual System Summary
- **System Integrity Mapping:** [How values map to scales/tokens]
- **Anti-Generic Justification:** [Why conventions are or are not used]
- **Color Strategy:** [Semantic role usage]
- **Elevation Strategy:** [Layer model]

## 4. Layout and Responsive Breakpoints
| Breakpoint | Width | Layout Behavior |
| :--- | :--- | :--- |
| **Mobile** | < 640px | [Behavior] |
| **Tablet** | 640px - 1024px | [Behavior] |
| **Desktop** | > 1024px | [Behavior] |

## 5. Component Inventory and Full State Matrix
| Component | State | Visual Change Mechanism | Accessibility Rationale |
| :--- | :--- | :--- | :--- |
| **[Name]** | Default | [Base style] | [Reason] |
|  | Hover | [Change] | [Reason] |
|  | Active | [Change] | [Reason] |
|  | Focus | [Change] | [Reason] |
|  | Disabled | [Change] | [Reason] |
|  | Loading | [Change] | [Reason] |
|  | Error | [Change] | [Reason] |
|  | Empty | [Change] | [Reason] |

## 6. Motion Behavior
- **Duration scale:** fast/base/slow values
- **Easing standard:** [Curve]
- **Use motion when:** [Conditions]
- **Suppress motion when:** [Conditions]
- **Reduced-motion fallback:** [Behavior]

## 7. Screen Specifications
### Screen: [Name]
- **Purpose:** [Task]
- **Layout structure:** [Zones]
- **Key hierarchy:**
  1. [Primary focal point]
  2. [Secondary]
  3. [Tertiary]
- **Detailed layout rules:**
  - [Rule]
  - [Rule]

## 8. Hierarchy Audit
- Single dominant focal point: [Pass/Fail + note]
- Scanning order unambiguous: [Pass/Fail + note]
- Primary task <= 3 visual stops: [Pass/Fail + note]
- Competing elements subordinate: [Pass/Fail + note]

## 9. Edge Case Simulation
- 320px width: [Result]
- 3x normal text length: [Result]
- 0 results: [Result]
- Destructive actions: [Result]

## 10. Consistency Check
- Spacing from scale only: [Pass/Fail]
- Type from scale only: [Pass/Fail]
- Color role integrity: [Pass/Fail]
- One-off values justified: [Pass/Fail]

## 11. Implementation Handoff
- [ ] Tailwind config mapping from `assets/tailwind.config.template.js`
- [ ] CSS tokens from `assets/design-system-core.css`
- **Assets required:** [Icons/Images/Fonts]

## 12. Accessibility and QA Rubric
- [ ] Contrast meets WCAG AA
- [ ] Touch targets >= 44x44
- [ ] Visible keyboard focus for all interactive controls
- [ ] Semantic HTML roles/elements
- [ ] Labels and assistive text coverage
- [ ] No horizontal overflow at 320px
- [ ] State coverage complete (loading/error/empty)
```

---

## 3. Minimal Output Modes

Use these when the request explicitly asks for a narrower deliverable.

### 3.1 Component-only Template

```markdown
# Component Spec: [Feature/Component Set]

## Design Intent Declaration
- Primary user goal:
- Primary UX constraint:
- Risk tolerance:
- Environmental constraints:

## Component Inventory
- [Component name]: purpose, variants, dependencies

## Full State Matrix
- Default, Hover, Active, Focus, Disabled, Loading, Error, Empty
- Visual mechanisms and accessibility rationale for each state

## Consistency Check
- Token mapping and one-off justification
```

### 3.2 Layout-only Template

```markdown
# Layout Spec: [Feature Name]

## Design Intent Declaration
- Primary user goal:
- Primary UX constraint:
- Risk tolerance:
- Environmental constraints:

## Density Mode and Breakpoint Strategy
- Density Mode:
- Mobile behavior:
- Tablet behavior:
- Desktop behavior:

## Zone Map
- Header:
- Navigation:
- Primary content:
- Secondary/supporting content:

## Hierarchy Audit
- Dominant focal point:
- Scan order:
- <=3 visual stops:
- Subordination of competing elements:
```

### 3.3 Token definition-only Template

```markdown
# Token Spec: [Feature/System Scope]

## Design Intent Declaration
- Primary user goal:
- Primary UX constraint:
- Risk tolerance:
- Environmental constraints:

## Token Roles
- Spacing scale usage:
- Type scale usage:
- Color role mapping:
- Elevation role mapping:
- Motion timing/easing mapping:

## Density Mapping
- Compact:
- Balanced:
- Spacious:

## Consistency Check
- Scale compliance:
- Semantic role integrity:
- Justified exceptions:
```

---

## 4. Standard Layout Patterns

### 4.1 Pro App (3-Pane)
Use for email/SaaS/admin tools.

```css
body { overflow: hidden; }

.app-container {
  display: grid;
  grid-template-columns: 240px 320px 1fr;
  height: 100vh;
  width: 100vw;
}

.pane {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  border-right: 1px solid var(--color-border-subtle);
}
```

### 4.2 Dashboard Grid
Use for analytics/home screens.

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  padding: 32px;
}

.col-span-2 { grid-column: span 2; }
.col-span-full { grid-column: 1 / -1; }
```

### 4.3 Centered Single Column
Use for settings/profiles/text-heavy pages.

```css
.container-sm {
  max-width: 640px;
  margin: 0 auto;
  padding: 48px 24px;
}
```
