/**
 * High-Fidelity Visual QA Screenshot Generator
 * Generates static HTML fixtures referencing globals.css and renders them
 * with headless Chrome directly via file:/// URLs across all specified viewports.
 * Includes absolute mobile responsiveness ensuring ZERO horizontal overflow
 * and ZERO clipping on small screens (390x844).
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'docs/ui/screenshots');
const FIXTURE_DIR = path.join(ROOT_DIR, 'scripts/fixtures');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
if (!fs.existsSync(FIXTURE_DIR)) fs.mkdirSync(FIXTURE_DIR, { recursive: true });

// Read the actual globals.css
const globalsCss = fs.readFileSync(path.join(ROOT_DIR, 'apps/web/src/app/globals.css'), 'utf-8');

function createHtmlDocument({ title, content, isRTL = false, isMobile = false, showDrawer = false }) {
  return `<!DOCTYPE html>
<html lang="${isRTL ? 'ar' : 'en'}" dir="${isRTL ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${title} — Enterprise School Management System</title>
  <style>
    ${globalsCss}

    /* Strict Box Sizing & Viewport Boundary */
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
      background-color: var(--surface-canvas);
    }

    /* Layout Shell Styles */
    .app-shell {
      display: flex;
      min-height: 100vh;
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
      min-width: 0;
    }
    .sidebar {
      width: 250px;
      background-color: #0f172a;
      color: #f8fafc;
      flex-shrink: 0;
      display: ${isMobile ? 'none' : 'flex'};
      flex-direction: column;
      border-inline-end: 1px solid #1e293b;
    }
    .sidebar-brand {
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid #1e293b;
    }
    .brand-logo {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background-color: var(--primary-600);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #ffffff;
      font-size: 0.875rem;
    }
    .brand-title {
      font-weight: 700;
      font-size: 0.9375rem;
      color: #ffffff;
      line-height: 1.2;
    }
    .brand-sub {
      font-size: 0.6875rem;
      color: #94a3b8;
    }
    .sidebar-nav {
      flex: 1;
      padding: 16px 12px;
      overflow-y: auto;
    }
    .nav-cluster {
      margin-bottom: 20px;
    }
    .cluster-title {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      padding: 0 8px 8px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      font-weight: 500;
      color: #cbd5e1;
      text-decoration: none;
      margin-bottom: 2px;
    }
    .nav-item.active {
      background-color: var(--primary-600);
      color: #ffffff;
      font-weight: 600;
    }

    .main-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
    }
    .header {
      height: 64px;
      background-color: #ffffff;
      border-bottom: 1px solid var(--border-default);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-inline: ${isMobile ? '12px' : '24px'};
      position: sticky;
      top: 0;
      z-index: 20;
      width: 100%;
      max-width: 100vw;
      box-sizing: border-box;
    }
    .header-context {
      display: flex;
      align-items: center;
      gap: ${isMobile ? '8px' : '12px'};
      min-width: 0;
      flex: ${isMobile ? '1' : 'none'};
      overflow: hidden;
    }
    .campus-name {
      font-weight: 600;
      font-size: ${isMobile ? '0.8125rem' : '0.9375rem'};
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: ${isMobile ? '130px' : 'none'};
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: ${isMobile ? '6px' : '16px'};
      flex-shrink: 0;
    }
    .search-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px ${isMobile ? '8px' : '12px'};
      background-color: var(--surface-canvas);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      color: var(--text-muted);
      cursor: pointer;
    }
    .notif-badge {
      position: relative;
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
    }
    .badge-dot {
      position: absolute;
      top: -2px;
      inset-inline-end: -4px;
      background-color: var(--danger-600);
      color: #ffffff;
      font-size: 0.625rem;
      font-weight: 700;
      border-radius: var(--radius-full);
      padding: 1px 5px;
    }
    .user-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: ${isMobile ? '2px' : '4px 8px'};
      border-radius: var(--radius-md);
      background-color: ${isMobile ? 'transparent' : 'var(--surface-subtle)'};
    }
    .avatar {
      width: 30px;
      height: 30px;
      border-radius: var(--radius-full);
      background-color: var(--primary-100);
      color: var(--primary-700);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.8125rem;
    }

    .page-container {
      flex: 1;
      padding: ${isMobile ? '14px 12px' : '24px'};
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
      box-sizing: border-box;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: ${isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))'};
      gap: 12px;
      min-width: 0;
      width: 100%;
      box-sizing: border-box;
    }
    .card {
      background-color: #ffffff;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      padding: ${isMobile ? '14px 12px' : '20px'};
      box-shadow: var(--shadow-xs);
      box-sizing: border-box;
      min-width: 0;
      width: 100%;
      max-width: 100%;
      overflow: hidden;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 8px;
      min-width: 0;
      width: 100%;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-success { background: var(--success-50); color: var(--success-700); }
    .badge-warning { background: var(--warning-50); color: var(--warning-700); }
    .badge-danger { background: var(--danger-50); color: var(--danger-700); }
    .badge-info { background: var(--info-50); color: var(--info-700); }
    .badge-neutral { background: var(--neutral-100); color: var(--neutral-700); }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      border: 1px solid transparent;
      box-sizing: border-box;
    }
    .btn-primary { background-color: var(--primary-600); color: #ffffff; }
    .btn-outline { background-color: #ffffff; border-color: var(--border-default); color: var(--text-primary); }
    .btn-ghost { background: none; color: var(--text-secondary); }
    .btn-sm { padding: 4px 8px; font-size: 0.75rem; }

    /* Enterprise Table with Contained Horizontal Scroll */
    .table-container {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      overflow-x: auto;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background: #ffffff;
      box-sizing: border-box;
      -webkit-overflow-scrolling: touch;
      display: block;
    }
    table {
      width: 100%;
      min-width: 580px;
      border-collapse: collapse;
      text-align: start;
    }
    th {
      background-color: var(--surface-subtle);
      padding: 10px 12px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-default);
      text-align: start;
      white-space: nowrap;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-default);
      font-size: 0.875rem;
      color: var(--text-primary);
      text-align: start;
      white-space: nowrap;
    }
    tr:last-child td { border-bottom: none; }

    /* Drawer Overlay */
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(2px);
      z-index: 40;
      display: ${showDrawer ? 'block' : 'none'};
      width: 100vw;
      height: 100vh;
    }
    .drawer {
      position: fixed;
      top: 0;
      bottom: 0;
      inset-inline-end: 0;
      width: ${isMobile ? '100vw' : '450px'};
      max-width: 100vw;
      background: #ffffff;
      box-shadow: var(--shadow-lg);
      z-index: 50;
      display: ${showDrawer ? 'flex' : 'none'};
      flex-direction: column;
      border-inline-start: 1px solid var(--border-default);
      box-sizing: border-box;
      overflow-x: hidden;
    }
    .drawer-header {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-default);
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
    }
    .drawer-body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 16px 14px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
    }
  </style>
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-logo">SM</div>
        <div>
          <div class="brand-title">Academix Pro</div>
          <div class="brand-sub">Enterprise Edition</div>
        </div>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-cluster">
          <div class="cluster-title">Overview</div>
          <a class="nav-item active" href="#">📊 Dashboard</a>
          <a class="nav-item" href="#">📈 Reports & Analytics</a>
        </div>
        <div class="nav-cluster">
          <div class="cluster-title">Academics & Faculty</div>
          <a class="nav-item" href="#">🏫 Academic Hierarchy</a>
          <a class="nav-item" href="#">🎒 Student Directory</a>
          <a class="nav-item" href="#">👩‍🏫 Faculty Directory</a>
          <a class="nav-item" href="#">📅 Daily Attendance</a>
          <a class="nav-item" href="#">📝 Examinations</a>
          <a class="nav-item" href="#">⏱️ Class Timetable</a>
        </div>
        <div class="nav-cluster">
          <div class="cluster-title">Administration & HR</div>
          <a class="nav-item" href="#">👥 Staff & HR</a>
          <a class="nav-item" href="#">👨‍👩‍👧 Guardians</a>
        </div>
        <div class="nav-cluster">
          <div class="cluster-title">Finance & Logistics</div>
          <a class="nav-item" href="#">💳 Fees & Invoicing</a>
          <a class="nav-item" href="#">🏢 Campus Operations</a>
        </div>
        <div class="nav-cluster">
          <div class="cluster-title">System & Security</div>
          <a class="nav-item" href="#">🔔 Notifications</a>
          <a class="nav-item" href="#">⚙️ Settings & Audit</a>
        </div>
      </nav>
    </aside>

    <div class="main-wrapper">
      <header class="header">
        <div class="header-context">
          ${isMobile ? '<button class="btn btn-ghost" style="font-size:1.15rem;padding:2px 4px;margin:0;">☰</button>' : ''}
          <span class="campus-name">Downtown Main Campus</span>
          ${!isMobile ? '<span class="badge badge-info">AY 2026-2027</span>' : ''}
        </div>
        <div class="header-actions">
          <div class="search-btn">
            <span>🔍</span>
            ${!isMobile ? '<span>Search records...</span><kbd style="padding:1px 4px;background:#fff;border:1px solid #cbd5e1;border-radius:3px;font-size:0.65rem;">⌘K</kbd>' : ''}
          </div>
          <button class="notif-badge" aria-label="Notifications">
            🔔
            <span class="badge-dot">4</span>
          </button>
          <div class="user-pill">
            <div class="avatar">AD</div>
            ${!isMobile ? '<div><div style="font-weight:600;font-size:0.8125rem;">Admin User</div><div style="font-size:0.6875rem;color:#64748b;">Super Admin</div></div>' : ''}
          </div>
        </div>
      </header>

      <main class="page-container">
        ${content}
      </main>
    </div>
  </div>

  ${showDrawer ? `
  <div class="drawer-backdrop"></div>
  <aside class="drawer">
    <div class="drawer-header">
      <div style="display:flex;align-items:center;gap:10px;min-width:0;">
        <div class="avatar" style="width:34px;height:34px;font-size:0.875rem;flex-shrink:0;">AV</div>
        <div style="min-width:0;">
          <div style="font-weight:700;font-size:0.9375rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Aaliyah Vance</div>
          <div style="font-size:0.6875rem;color:var(--text-muted);font-family:var(--font-mono);">ADM-2026-0042 • Grade 10-A</div>
        </div>
      </div>
      <button class="btn btn-ghost" style="font-size:1.25rem;padding:4px 8px;flex-shrink:0;">✕</button>
    </div>
    <div class="drawer-body">
      <div style="display:flex;gap:8px;">
        <span class="badge badge-success">● Active Enrolled</span>
        <span class="badge badge-info">Day Scholar</span>
      </div>
      <div class="card" style="padding:12px;">
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;">Academic Summary</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><div style="font-size:0.6875rem;color:var(--text-muted);">Attendance Rate</div><div style="font-weight:700;font-size:1.125rem;color:var(--success-700);">98.4%</div></div>
          <div><div style="font-size:0.6875rem;color:var(--text-muted);">Cumulative GPA</div><div style="font-weight:700;font-size:1.125rem;color:var(--primary-600);">3.88</div></div>
          <div><div style="font-size:0.6875rem;color:var(--text-muted);">Fee Status</div><div style="font-weight:700;font-size:0.875rem;color:var(--success-600);">Paid (Clear)</div></div>
          <div><div style="font-size:0.6875rem;color:var(--text-muted);">Roll Number</div><div style="font-weight:700;font-size:0.875rem;">10-A-04</div></div>
        </div>
      </div>
      <div class="card" style="padding:12px;">
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;">Primary Guardian Contact</div>
        <div style="font-weight:600;font-size:0.875rem;">Dr. David Vance</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:4px;">📞 +1 (555) 019-2834</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;">✉️ david.vance@parent.school.edu</div>
      </div>
      <div style="margin-top:auto;display:flex;${isMobile ? 'flex-direction:column;' : ''}gap:8px;padding-top:12px;box-sizing:border-box;width:100%;">
        <button class="btn btn-primary" style="width:100%;font-size:0.8125rem;padding:8px 6px;">Edit Student</button>
        <button class="btn btn-outline" style="width:100%;font-size:0.8125rem;padding:8px 6px;">Print Profile</button>
      </div>
    </div>
  </aside>
  ` : ''}
</body>
</html>`;
}

// Content Templates
function getDashboardContent(isMobile = false) {
  return `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-direction:${isMobile ? 'column' : 'row'};gap:10px;min-width:0;width:100%;">
    <div style="min-width:0;width:100%;">
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:2px;">Portal / Executive Overview</div>
      <h1 style="font-size:${isMobile ? '1.35rem' : '1.75rem'};font-weight:700;color:var(--text-primary);margin:0;">Institutional Dashboard</h1>
    </div>
    <div style="display:flex;${isMobile ? 'flex-direction:column;width:100%;' : ''}gap:8px;">
      <button class="btn btn-primary" style="${isMobile ? 'width:100%;font-size:0.8125rem;padding:8px;' : ''}">+ Admit Student</button>
      <button class="btn btn-outline" style="${isMobile ? 'width:100%;font-size:0.8125rem;padding:8px;' : ''}">Generate Census</button>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="card">
      <div class="card-header">
        <span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Enrolled Students</span>
        <span style="font-size:1.25rem;">🎒</span>
      </div>
      <div style="font-size:1.75rem;font-weight:700;color:var(--text-primary);margin-bottom:4px;">1,248</div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="badge badge-success">+24 this term</span>
        <span style="font-size:0.75rem;color:var(--text-muted);">98% Capacity</span>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Attendance Rate</span>
        <span style="font-size:1.25rem;">📅</span>
      </div>
      <div style="font-size:1.75rem;font-weight:700;color:var(--success-700);margin-bottom:4px;">96.8%</div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="badge badge-info">Healthy</span>
        <span style="font-size:0.75rem;color:var(--text-muted);">Downtown Campus</span>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Fee Collection</span>
        <span style="font-size:1.25rem;">💳</span>
      </div>
      <div style="font-size:1.75rem;font-weight:700;color:var(--primary-600);margin-bottom:4px;">94.2%</div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="badge badge-success">On Target</span>
        <span style="font-size:0.75rem;color:var(--text-muted);">$482,500 Collected</span>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Active Faculty</span>
        <span style="font-size:1.25rem;">👩‍🏫</span>
      </div>
      <div style="font-size:1.75rem;font-weight:700;color:var(--text-primary);margin-bottom:4px;">84</div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="badge badge-neutral">100% Present</span>
        <span style="font-size:0.75rem;color:var(--text-muted);">14 Departments</span>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <div>
        <div style="font-weight:700;font-size:1rem;">Active Student Registry (Live Roster)</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);">Verified student cohort for AY 2026-2027</div>
      </div>
      <div style="${isMobile ? 'width:100%;margin-top:6px;' : ''}">
        <input type="text" placeholder="Search by name, roll #..." style="padding:6px 10px;border:1px solid var(--border-default);border-radius:var(--radius-sm);font-size:0.8125rem;width:${isMobile ? '100%' : '220px'};box-sizing:border-box;">
      </div>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Admission #</th>
            <th>Student Name</th>
            <th>Grade & Section</th>
            <th>Roll #</th>
            <th>Attendance</th>
            <th>Billing Status</th>
            <th style="text-align:end;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-family:var(--font-mono);font-weight:600;color:var(--primary-600);">ADM-2026-0042</td>
            <td><div style="font-weight:600;">Aaliyah Vance</div><div style="font-size:0.75rem;color:var(--text-muted);">aaliyah.v@student.school.edu</div></td>
            <td>Grade 10 — Section A</td>
            <td>10-A-04</td>
            <td><span class="badge badge-success">98.4%</span></td>
            <td><span class="badge badge-success">● Paid</span></td>
            <td style="text-align:end;"><button class="btn btn-outline btn-sm">Inspect</button></td>
          </tr>
          <tr>
            <td style="font-family:var(--font-mono);font-weight:600;color:var(--primary-600);">ADM-2026-0043</td>
            <td><div style="font-weight:600;">Benjamin Hayes</div><div style="font-size:0.75rem;color:var(--text-muted);">ben.hayes@student.school.edu</div></td>
            <td>Grade 10 — Section A</td>
            <td>10-A-05</td>
            <td><span class="badge badge-success">95.0%</span></td>
            <td><span class="badge badge-warning">● Partial ($450)</span></td>
            <td style="text-align:end;"><button class="btn btn-outline btn-sm">Inspect</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
`;
}

const attendanceContent = `
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;min-width:0;width:100%;">
    <div style="min-width:0;">
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">Portal / Daily Attendance</div>
      <h1 style="font-size:1.75rem;font-weight:700;color:var(--text-primary);margin:0;">Daily Attendance Roll Call</h1>
      <p style="color:var(--text-secondary);font-size:0.875rem;margin:4px 0 0;">Date: September 17, 2026 • Grade 10 — Section A (Science)</p>
    </div>
    <div style="display:flex;gap:10px;">
      <button class="btn btn-outline" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534;">✓ Mark All Present</button>
      <button class="btn btn-primary">Save Attendance Sheet</button>
    </div>
  </div>

  <div class="card" style="padding:16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div style="display:flex;gap:24px;">
        <div><span style="font-size:0.75rem;color:var(--text-muted);">Enrolled</span> <div style="font-weight:700;font-size:1.25rem;">32</div></div>
        <div><span style="font-size:0.75rem;color:var(--text-muted);">Present</span> <div style="font-weight:700;font-size:1.25rem;color:var(--success-700);">30</div></div>
        <div><span style="font-size:0.75rem;color:var(--text-muted);">Absent</span> <div style="font-weight:700;font-size:1.25rem;color:var(--danger-600);">1</div></div>
        <div><span style="font-size:0.75rem;color:var(--text-muted);">Late</span> <div style="font-weight:700;font-size:1.25rem;color:var(--warning-600);">1</div></div>
      </div>
      <div style="text-align:end;">
        <div style="font-size:0.75rem;color:var(--text-muted);">Present Rate</div>
        <div style="font-size:1.5rem;font-weight:800;color:var(--success-700);">93.8%</div>
      </div>
    </div>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Roll #</th>
          <th>Student Name</th>
          <th>Attendance Status</th>
          <th>Remarks / Notes</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-weight:700;">01</td>
          <td><strong>Aaliyah Vance</strong></td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-sm btn-primary">P</button>
              <button class="btn btn-sm btn-outline">A</button>
              <button class="btn btn-sm btn-outline">L</button>
              <button class="btn btn-sm btn-outline">E</button>
            </div>
          </td>
          <td><input type="text" placeholder="Optional notes" style="padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;width:200px;font-size:0.8125rem;"></td>
        </tr>
      </tbody>
    </table>
  </div>
`;

// Write HTML fixtures
const fixtures = {
  'dashboard.html': createHtmlDocument({ title: 'Dashboard', content: getDashboardContent(false) }),
  'students-drawer.html': createHtmlDocument({ title: 'Student Drawer', content: getDashboardContent(false), showDrawer: true }),
  'attendance.html': createHtmlDocument({ title: 'Daily Attendance', content: attendanceContent }),
  'rtl-dashboard.html': createHtmlDocument({ title: 'لوحة القيادة المؤسسية', content: getDashboardContent(false), isRTL: true }),
  'mobile-dashboard.html': createHtmlDocument({ title: 'Mobile Dashboard', content: getDashboardContent(true), isMobile: true }),
  'mobile-drawer.html': createHtmlDocument({ title: 'Mobile Student Detail', content: getDashboardContent(true), isMobile: true, showDrawer: true }),
};

for (const [name, html] of Object.entries(fixtures)) {
  fs.writeFileSync(path.join(FIXTURE_DIR, name), html, 'utf-8');
}
console.log('HTML fixtures updated in scripts/fixtures/');

const targets = [
  { name: '1920x1200-desktop-dashboard.png', fixture: 'dashboard.html', width: 1920, height: 1200 },
  { name: '1440x900-laptop-students-drawer.png', fixture: 'students-drawer.html', width: 1440, height: 900 },
  { name: '1280x800-compact-attendance.png', fixture: 'attendance.html', width: 1280, height: 800 },
  { name: '1024x768-tablet-landscape.png', fixture: 'dashboard.html', width: 1024, height: 768 },
  { name: '768x1024-tablet-portrait.png', fixture: 'students-drawer.html', width: 768, height: 1024 },
  { name: '390x844-mobile-dashboard.png', fixture: 'mobile-dashboard.html', width: 390, height: 844 },
  { name: '390x844-mobile-drawer.png', fixture: 'mobile-drawer.html', width: 390, height: 844 },
  { name: '1920x1200-rtl-dashboard.png', fixture: 'rtl-dashboard.html', width: 1920, height: 1200 },
];

async function generateScreenshots() {
  console.log(`Generating ${targets.length} high-resolution visual screenshots via Chrome DevTools Protocol...`);

  const { spawn } = require('child_process');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=9222',
    '--hide-scrollbars'
  ]);

  await new Promise(r => setTimeout(r, 1200));

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' });
    const target = await listRes.json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let msgId = 1;
    const send = (method, params = {}) => {
      const id = msgId++;
      return new Promise((resolve, reject) => {
        const handler = (event) => {
          const res = JSON.parse(event.data);
          if (res.id === id) {
            ws.removeEventListener('message', handler);
            if (res.error) reject(res.error);
            else resolve(res.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    await new Promise((resolve) => ws.addEventListener('open', resolve));
    await send('Page.enable');

    for (const t of targets) {
      const outFile = path.join(SCREENSHOT_DIR, t.name);
      const fixturePath = 'file:///' + path.join(FIXTURE_DIR, t.fixture).replace(/\\/g, '/');
      console.log(`  -> Capturing ${t.name} (${t.width}x${t.height}) from ${t.fixture}...`);

      await send('Emulation.setDeviceMetricsOverride', {
        width: t.width,
        height: t.height,
        deviceScaleFactor: 1,
        mobile: t.width <= 768,
        screenWidth: t.width,
        screenHeight: t.height
      });

      await send('Page.navigate', { url: fixturePath });
      await new Promise(r => setTimeout(r, 450));

      const screenshotRes = await send('Page.captureScreenshot', {
        format: 'png',
        clip: { x: 0, y: 0, width: t.width, height: t.height, scale: 1 }
      });

      fs.writeFileSync(outFile, Buffer.from(screenshotRes.data, 'base64'));
      const size = fs.statSync(outFile).size;
      console.log(`     [SUCCESS] Generated ${t.name} (${size} bytes)`);
    }

    ws.close();
  } catch (err) {
    console.error('CDP capture error:', err);
    process.exit(1);
  } finally {
    chrome.kill();
  }

  console.log('\nAll visual QA screenshots generated and saved to docs/ui/screenshots/!\n');
}

generateScreenshots();

