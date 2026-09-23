# Accessibility (a11y) & Bidirectional RTL Standards

This document establishes the compliance standards for WCAG 2.1 AA accessibility and bidirectional RTL readiness.

---

## 1. Accessibility Compliance Checklist

1. **Color Contrast Ratios:**
   - Text against backgrounds satisfies minimum 4.5:1 ratio for standard text and 3:1 for large text.
   - Status indicators (Present/Absent, Paid/Unpaid) never rely solely on color; textual labels and distinct shapes/icons are always provided.
2. **Keyboard Navigation:**
   - All interactive controls (`button`, `a`, `input`, `select`) are reachable via sequential `Tab` key navigation.
   - Visible 2px focus rings (`--border-focus: #38bdf8`) with 2px offset on all active elements.
   - Escape key dismisses modals, drawers, and notification dropdowns.
3. **Screen Readers & Semantic HTML:**
   - Proper landmark elements: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`.
   - Accessible form inputs with explicit `<label>` tags and `aria-describedby` for helper and error texts.
   - Modals utilize `role="dialog"`, `aria-modal="true"`, and focus trapping.
4. **Reduced Motion:**
   - CSS media query `@media (prefers-reduced-motion: reduce)` disables non-essential transitions and shimmers.

---

## 2. RTL Architecture Standards

To support right-to-left languages (Urdu, Arabic) seamlessly:
- The root document sets `dir="ltr"` or `dir="rtl"` dynamically.
- Zero hardcoded `margin-left`, `margin-right`, `padding-left`, `padding-right`, `left`, `right`.
- Strict usage of CSS Logical Properties:
  - `margin-inline-start` / `margin-inline-end`
  - `padding-inline-start` / `padding-inline-end`
  - `border-inline-start` / `border-inline-end`
  - `inset-inline-start` / `inset-inline-end`
  - `text-align: start` / `text-align: end`
- Directional icons (arrows, chevrons) rotate 180 degrees in RTL mode via `[dir="rtl"] .rtl-flip { transform: scaleX(-1); }`.
