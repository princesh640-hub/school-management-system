# Enterprise School Management System — Design System Specification

This specification establishes the visual language, design tokens, component standards, and accessibility rules for the Enterprise School Management System.

---

## 1. Design Principles

1. **Institutional & Trustworthy:** Clean, professional, purposeful aesthetics appropriate for serious academic administration.
2. **High Information Clarity:** High contrast, deliberate typography, and clear spatial hierarchy allowing staff to parse complex records rapidly.
3. **Calm & Minimal:** Avoid distracting animations, heavy glassmorphism, or gratuitous gradients.
4. **Accessible by Default:** Full WCAG 2.1 AA compliance, focus rings, semantic HTML, and bidirectional RTL readiness.

---

## 2. Color Tokens

### A. Brand & Neutral Palette
| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| `--brand-primary` | `#0284c7` (Sky 600) | Primary interactive actions, active navigation indicator |
| `--brand-primary-hover` | `#0369a1` (Sky 700) | Hover state for primary buttons |
| `--brand-primary-light` | `#f0f9ff` (Sky 50) | Highlight background, active row state |
| `--brand-secondary` | `#0f172a` (Slate 900) | Sidebar, primary text, dark chrome |
| `--brand-secondary-muted`| `#1e293b` (Slate 800) | Sidebar hover, elevated dark containers |
| `--surface-canvas` | `#f8fafc` (Slate 50) | Main application background |
| `--surface-card` | `#ffffff` (White) | Card containers, modals, table rows |
| `--surface-subtle` | `#f1f5f9` (Slate 100) | Table headers, secondary buttons, input backgrounds |
| `--border-default` | `#e2e8f0` (Slate 200) | Standard divider, card borders |
| `--border-focus` | `#38bdf8` (Sky 400) | Accessible focus rings |
| `--text-primary` | `#0f172a` (Slate 900) | Headings, primary content |
| `--text-secondary` | `#475569` (Slate 600) | Table text, labels, secondary metadata |
| `--text-muted` | `#94a3b8` (Slate 400) | Placeholders, timestamps, captions |

### B. Semantic Status Colors
| Token Name | Hex Code | Background | Purpose |
| :--- | :--- | :--- | :--- |
| `--status-success` | `#15803d` (Green 700) | `#dcfce7` (Green 100) | Present attendance, Paid invoices, Active status, Passed exams |
| `--status-warning` | `#b45309` (Amber 700) | `#fef3c7` (Amber 100) | Partial fee payments, Late attendance, Pending approval |
| `--status-danger` | `#b91c1c` (Red 700) | `#fee2e2` (Red 100) | Absent attendance, Overdue fee, Failed exam, Deactivated user |
| `--status-info` | `#0369a1` (Sky 700) | `#e0f2fe` (Sky 100) | General announcements, system info, academic notes |

---

## 3. Typography System

**Base Family:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`  
**Monospace (IDs, Roll #, Invoices):** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

| Level | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `28px (1.75rem)` | 700 | 1.25 | Portal dashboard welcome, major landing headlines |
| **Heading 1** | `24px (1.5rem)` | 700 | 1.3 | Page titles (`Students`, `Academics`, `Fees`) |
| **Heading 2** | `18px (1.125rem)` | 600 | 1.4 | Section headers, card titles, drawer headers |
| **Heading 3** | `15px (0.9375rem)` | 600 | 1.4 | Modal subheaders, table grouping headers |
| **Body Primary**| `14px (0.875rem)` | 400 / 500 | 1.5 | Standard body text, table row content, form inputs |
| **Body Secondary**| `13px (0.8125rem)` | 400 | 1.5 | Help text, table secondary metadata, descriptions |
| **Caption / KPI** | `11px (0.6875rem)` | 600 / 700 | 1.3 | Badges, status chips, micro-labels, uppercase tags |
| **KPI Stat Value**| `30px (1.875rem)` | 700 | 1.1 | Numeric counters on dashboard KPI cards |

---

## 4. Spacing, Elevation & Radius Scales

### Spacing Scale
- `2xs: 4px`
- `xs: 8px`
- `sm: 12px`
- `md: 16px`
- `lg: 24px`
- `xl: 32px`
- `2xl: 48px`

### Border Radius Scale
- `xs: 4px` (Inputs, small buttons, tags)
- `sm: 6px` (Standard buttons, dropdowns, table cells)
- `md: 8px` (Standard cards, modals, alerts)
- `lg: 12px` (Outer dashboard cards, login panel)
- `full: 9999px` (Avatars, pill badges)

### Shadow / Elevation Scale
- `--shadow-sm`: `0 1px 2px 0 rgba(0, 0, 0, 0.05)` (Subtle card border elevation)
- `--shadow-md`: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)` (Dropdowns, popovers)
- `--shadow-lg`: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)` (Modals, drawers)

---

## 5. Bidirectional LTR / RTL Architecture

All components and layouts strictly consume CSS Logical Properties:
- `margin-inline-start` / `margin-inline-end` instead of `margin-left` / `margin-right`
- `padding-inline-start` / `padding-inline-end` instead of `padding-left` / `padding-right`
- `border-inline-start` instead of `border-left`
- `inset-inline-start` / `inset-inline-end` instead of `left` / `right`
- `text-align: start` instead of `text-align: left`

This ensures that setting `dir="rtl"` in the root HTML mirrors the entire interface cleanly without layout breakage.
