# Role-Based Experience & Access Matrix

The Enterprise School Management System provides role-aware navigation and dashboard views tailored to distinct administrative and academic user roles.

---

## 1. Role Personas & Priority Workflows

### 👑 Super Admin / School Owner
- **Primary Concerns:** Institutional health, campus governance, financial profitability, compliance, security audit trail.
- **Tailored Dashboard:** High-level school KPIs (Census, total revenue, collection rate, faculty ratio), campus switcher, latest security audits.
- **Visible Navigation:** Full access to all 5 navigation clusters (Overview, Academics, Administration, Finance & Operations, System).

### 🎓 Principal / Vice Principal
- **Primary Concerns:** Academic performance, teacher classroom allocations, daily student attendance, disciplinary notices, parent communications.
- **Tailored Dashboard:** Daily attendance rate, class grade averages, teacher attendance, student admissions count, pending notifications.
- **Visible Navigation:** Overview, Academics, Administration, Reports, Communications, Attendance, Exams.

### 👩‍🏫 Teacher / Class Teacher
- **Primary Concerns:** Assigned classroom roll call, syllabus coverage, exam schedule and marks entry, student progress.
- **Tailored Dashboard:** My Assigned Classes, Quick Attendance Roll-Call shortcut, Upcoming Subject Exams, Pending Marks Entry countdown.
- **Visible Navigation:** Dashboard, My Classes & Sections, Attendance Marking, Examination Marks Entry, Notifications.

### 💳 Accountant / Finance Officer
- **Primary Concerns:** Tuition billing, invoice generation, unpaid fee receivables, payment transactions, receipt issuing.
- **Tailored Dashboard:** Monthly Invoiced Amount, Total Collections Received, Outstanding Receivables, Overdue Invoices List.
- **Visible Navigation:** Dashboard, Fee Schedules, Invoices Ledger, Payment Recording, Financial Reports.

### 👨‍👩‍👧 Parent / Guardian
- **Primary Concerns:** Children's daily attendance, exam report cards, upcoming fee due dates, school circulars.
- **Tailored Dashboard:** Enrolled wards switcher, today's attendance status (Present/Absent), term exam grades, fee balance due.
- **Visible Navigation:** My Children, Attendance History, Grade Sheets, Fee Invoices, School Notices.

### 🎒 Student
- **Primary Concerns:** Today's class schedule, personal attendance rate, exam results, school announcements.
- **Tailored Dashboard:** Personal attendance percentage, subject grades & remarks, classroom circulars.
- **Visible Navigation:** My Academics, My Attendance, My Exam Results, Notifications.

---

## 2. Navigation Clusters & Role Visibility

```
Navigation Group         Super Admin    Principal    Teacher    Accountant    Parent    Student
-----------------------------------------------------------------------------------------------
1. Overview (Dashboard)       ✅            ✅          ✅          ✅          ✅        ✅
2. Academics & People         ✅            ✅          ✅*         ❌          ❌        ❌
3. Daily Attendance           ✅            ✅          ✅          ❌          ❌        ❌
4. Examinations & Results     ✅            ✅          ✅          ❌          ❌        ❌
5. Fees & Invoicing           ✅            ✅          ❌          ✅          ❌        ❌
6. Notifications Center       ✅            ✅          ✅          ✅          ✅        ✅
7. Reports & Analytics        ✅            ✅          ❌          ✅*         ❌        ❌
8. Settings & Audit Trail     ✅            ❌          ❌          ❌          ❌        ❌
```
*\* Role-restricted access: Teachers see only assigned sections; Accountants see financial reports only.*
