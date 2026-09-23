# Navigation & Information Architecture

This document defines the route hierarchy, layout hierarchy, and breadcrumb pathing for the Enterprise School Management System.

---

## 1. Route Hierarchy

```
/
├── login                                   # Authentication & Session Entry
└── portal/
    ├── dashboard                           # Role-Aware Main Dashboard
    ├── students/                           # Student Directory & Admissions
    │   └── [id]                            # Detailed Student Profile Drawer / View
    ├── teachers/                           # Faculty Directory & Assignments
    ├── academics/                          # Classes, Sections, Subjects, Rosters
    ├── attendance/                         # High-Speed Daily Attendance Sheet
    ├── examinations/                       # Exam Schedules & Grade Entry Sheet
    ├── fees/                               # Fee Schedules, Invoices & Payment Receipts
    ├── hr/                                 # Employee Directory & Staff Roles
    ├── operations/                         # Library, Transport, Hostel, Inventory
    ├── notifications/                      # Notifications Center & Broadcast Alerts
    ├── reports/                            # Demographic, Attendance & Fee Reports
    └── settings/                           # Institution Settings & Mutation Audit Trail
```

---

## 2. Navigation Architecture Components

### A. Sidebar Navigation
- 250px fixed desktop sidebar.
- Clustered into 5 collapsible domain sections with Lucide icons.
- Displays active route indicator with high-contrast accent color and subtle background highlight.
- Smooth collapse to mobile off-canvas drawer on viewport widths < 1024px.

### B. Global Header Bar
- Sticky 64px header.
- Displays Current Campus and Academic Year badges with instant switcher capabilities.
- Global search input shortcut (`Cmd/Ctrl + K`).
- Real-time Notifications Bell with live unread badge and dropdown.
- User Profile Pill with initials avatar, full name, active system role, and Quick Sign Out.

### C. Breadcrumb Navigation
- Contextual breadcrumb links at the top of detail screens (`Home / Students / John Doe`).
- Automatic generation based on current route segments.
