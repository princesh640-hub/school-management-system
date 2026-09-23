# Responsive Strategy & Breakpoint Guidelines

This document outlines the responsive transformation principles, layout breakpoints, and mobile behavior patterns.

---

## 1. Breakpoint Scale

| Breakpoint | Range | Device Archetype | Layout Behavior |
| :--- | :--- | :--- | :--- |
| **Mobile (`sm`)** | `< 768px` | iPhone / Android Phones | Off-canvas drawer, single-column stacked cards, full-width touch buttons, bottom action sheets |
| **Tablet (`md`)** | `768px – 1023px` | iPad / Galaxy Tabs | Collapsible sidebar, 2-column KPI grids, horizontal table scroll with fixed leftmost columns |
| **Laptop (`lg`)** | `1024px – 1439px` | 13"–15" Laptops | Persistent sidebar, 3-to-4 column cards, wide data tables |
| **Desktop (`xl`)**| `>= 1440px` | 24"+ Monitors / Stations | Split-pane layouts (list + detail inspector), dense administrative tables, full analytical charts |

---

## 2. Core Responsive Transformation Patterns

### A. Data Tables
- **Desktop:** Full multi-column view with sorting, column resize, and inline status badges.
- **Mobile:** Horizontal smooth scroll with elevation shadows on overflowing sides and frozen leftmost student ID/Name column.

### B. Navigation Shell
- **Desktop:** Fixed left sidebar.
- **Mobile:** Hamburger menu in header triggering a sliding off-canvas drawer with backdrop blur overlay and auto-closing on route navigation.

### C. Modals & Drawers
- **Desktop:** Centered floating dialog or right-hand slide drawer (450px width).
- **Mobile:** Full-screen dialog or bottom swipe sheet ensuring touch accessibility.
