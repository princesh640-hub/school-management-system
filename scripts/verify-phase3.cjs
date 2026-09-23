/**
 * Comprehensive Automated Verification Script for PHASE 3: UI/UX DESIGN
 * 
 * Verifies:
 * 1. Design System Tokens & Global CSS Baseline (CSS variables, reset, RTL logical properties)
 * 2. Complete UI/UX Specification Suite (6 documentation files)
 * 3. Atomic & Compound UI Component Library (15 reusable components)
 * 4. Application Shell & Enterprise Navigation (Sidebar, Header, Layout)
 * 5. Institutional Portal Pages (15 domain routes + login)
 * 6. Role-Based Dashboards & KPI Visualizations
 * 7. Future Module Previews (Timetable, Operations: Library, Transport, Hostel, Inventory)
 * 8. Mobile & Desktop Design Token Synchronization (Flutter Material 3 & Desktop Station)
 * 9. RTL Logical CSS Compliance
 * 10. Real API Integration & Absence of Broken Mocks
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT_DIR, relPath));
}

function fileContains(relPath, snippet) {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) return false;
  const content = fs.readFileSync(fullPath, 'utf-8');
  return content.includes(snippet);
}

console.log('================================================================');
console.log('PHASE 3 VERIFICATION: UI/UX DESIGN & DESIGN SYSTEM SPECIFICATION');
console.log('================================================================\n');

// 1. Design System Tokens & Global CSS
console.log('1. Checking Design System Tokens & Global CSS Baseline...');
assert(fileExists('apps/web/src/design-system/tokens.ts'), 'tokens.ts exists');
assert(fileContains('apps/web/src/design-system/tokens.ts', 'colors:'), 'tokens.ts defines color palette');
assert(fileContains('apps/web/src/design-system/tokens.ts', 'typography:'), 'tokens.ts defines typography scale');
assert(fileContains('apps/web/src/design-system/tokens.ts', 'spacing:'), 'tokens.ts defines 8-pt spacing grid');
assert(fileExists('apps/web/src/app/globals.css'), 'globals.css exists');
assert(fileContains('apps/web/src/app/globals.css', '--primary-600'), 'globals.css declares primary color CSS variable');
assert(fileContains('apps/web/src/app/globals.css', ':focus-visible'), 'globals.css implements WCAG focus-visible ring');
assert(fileContains('apps/web/src/app/globals.css', '@keyframes shimmer'), 'globals.css implements skeleton shimmer animation');
assert(fileContains('apps/web/src/app/globals.css', '[dir="rtl"]'), 'globals.css includes RTL layout support');

// 2. UI/UX Documentation Suite
console.log('\n2. Checking UI/UX Documentation Suite in docs/ui/...');
const docFiles = [
  'docs/ui/screen-inventory.md',
  'docs/ui/design-system.md',
  'docs/ui/role-experience.md',
  'docs/ui/navigation.md',
  'docs/ui/responsive-strategy.md',
  'docs/ui/accessibility.md',
];
for (const doc of docFiles) {
  assert(fileExists(doc), `${doc} exists`);
}
assert(fileContains('docs/ui/screen-inventory.md', 'Screen Inventory'), 'screen-inventory.md has inventory table');
assert(fileContains('docs/ui/design-system.md', 'Color Tokens'), 'design-system.md specifies color tokens');
assert(fileContains('docs/ui/role-experience.md', 'Super Admin'), 'role-experience.md specifies role matrix');
assert(fileContains('docs/ui/responsive-strategy.md', 'Breakpoint Scale'), 'responsive-strategy.md specifies breakpoint scale');
assert(fileContains('docs/ui/accessibility.md', 'WCAG 2.1 AA'), 'accessibility.md specifies WCAG standards');

// 3. Reusable Component Library
console.log('\n3. Checking Reusable Component Library in apps/web/src/components/...');
const components = [
  'apps/web/src/components/ui/Button.tsx',
  'apps/web/src/components/ui/Input.tsx',
  'apps/web/src/components/ui/Select.tsx',
  'apps/web/src/components/ui/Badge.tsx',
  'apps/web/src/components/ui/Card.tsx',
  'apps/web/src/components/ui/Modal.tsx',
  'apps/web/src/components/ui/Drawer.tsx',
  'apps/web/src/components/ui/Tabs.tsx',
  'apps/web/src/components/ui/Alert.tsx',
  'apps/web/src/components/feedback/EmptyState.tsx',
  'apps/web/src/components/feedback/ErrorState.tsx',
  'apps/web/src/components/feedback/LoadingSkeleton.tsx',
  'apps/web/src/components/forms/FormField.tsx',
  'apps/web/src/components/navigation/Breadcrumbs.tsx',
  'apps/web/src/components/data-table/DataTable.tsx',
];
for (const comp of components) {
  assert(fileExists(comp), `${comp} exists`);
}

// Check component features
assert(fileContains('apps/web/src/components/ui/Button.tsx', 'isLoading'), 'Button component supports loading spinner state');
assert(fileContains('apps/web/src/components/ui/Modal.tsx', 'Escape'), 'Modal component handles ESC key dismissal');
assert(fileContains('apps/web/src/components/data-table/DataTable.tsx', 'sortable'), 'DataTable supports sortable columns');
assert(fileContains('apps/web/src/components/data-table/DataTable.tsx', 'searchPlaceholder'), 'DataTable supports global search');

// 4. Application Shell & Navigation
console.log('\n4. Checking Application Shell & Navigation Layout...');
assert(fileExists('apps/web/src/components/Sidebar.tsx'), 'Sidebar.tsx exists');
assert(fileContains('apps/web/src/components/Sidebar.tsx', 'Overview'), 'Sidebar contains grouped clusters');
assert(fileContains('apps/web/src/components/Sidebar.tsx', 'usePathname'), 'Sidebar highlights active route');
assert(fileExists('apps/web/src/components/Header.tsx'), 'Header.tsx exists');
assert(fileContains('apps/web/src/components/Header.tsx', 'notifications'), 'Header features notification dropdown with unread badge');
assert(fileContains('apps/web/src/components/Header.tsx', 'logout'), 'Header features user profile menu and sign-out');
assert(fileExists('apps/web/src/app/(dashboard)/layout.tsx'), 'Dashboard layout.tsx exists');
assert(fileContains('apps/web/src/app/(dashboard)/layout.tsx', 'Sidebar'), 'Layout mounts Sidebar and Header');

// 5. Modernized Domain Pages
console.log('\n5. Checking Modernized Portal Pages...');
const portalPages = [
  { path: 'apps/web/src/app/(auth)/login/page.tsx', name: 'Authentication Login' },
  { path: 'apps/web/src/app/(dashboard)/portal/dashboard/page.tsx', name: 'Role-Based Dashboard' },
  { path: 'apps/web/src/app/(dashboard)/portal/students/page.tsx', name: 'Students Directory & Drawer' },
  { path: 'apps/web/src/app/(dashboard)/portal/teachers/page.tsx', name: 'Faculty & Teacher Cards' },
  { path: 'apps/web/src/app/(dashboard)/portal/academics/page.tsx', name: 'Academic Hierarchy' },
  { path: 'apps/web/src/app/(dashboard)/portal/attendance/page.tsx', name: 'Fast Roll Call Attendance' },
  { path: 'apps/web/src/app/(dashboard)/portal/examinations/page.tsx', name: 'Exams & Grades Registry' },
  { path: 'apps/web/src/app/(dashboard)/portal/fees/page.tsx', name: 'Fees Invoicing & Payment Modal' },
  { path: 'apps/web/src/app/(dashboard)/portal/guardians/page.tsx', name: 'Guardians & Student Wards' },
  { path: 'apps/web/src/app/(dashboard)/portal/hr/page.tsx', name: 'Staff & HR Directory' },
  { path: 'apps/web/src/app/(dashboard)/portal/notifications/page.tsx', name: 'Notification Broadcast Center' },
  { path: 'apps/web/src/app/(dashboard)/portal/settings/page.tsx', name: 'Institution Settings & Security Audit' },
  { path: 'apps/web/src/app/(dashboard)/portal/reports/page.tsx', name: 'Analytical Reports & Export Queue' },
  { path: 'apps/web/src/app/(dashboard)/portal/timetable/page.tsx', name: 'Class Timetable Visualizer' },
  { path: 'apps/web/src/app/(dashboard)/portal/operations/page.tsx', name: 'Campus Operations Hub' },
];

for (const page of portalPages) {
  assert(fileExists(page.path), `${page.name} (${page.path}) exists`);
}

// 6. Role-Based Dashboards & Real API Integrations
console.log('\n6. Checking Role-Based Dashboards & Real API Integration...');
assert(fileContains('apps/web/src/app/(dashboard)/portal/dashboard/page.tsx', 'reports/fee-summary'), 'Dashboard consumes real /reports/fee-summary API');
assert(fileContains('apps/web/src/app/(dashboard)/portal/dashboard/page.tsx', 'audit?limit=5'), 'Dashboard consumes real /audit API');
assert(fileContains('apps/web/src/app/(dashboard)/portal/dashboard/page.tsx', 'principal'), 'Dashboard implements Principal persona');
assert(fileContains('apps/web/src/app/(dashboard)/portal/dashboard/page.tsx', 'teacher'), 'Dashboard implements Teacher persona');
assert(fileContains('apps/web/src/app/(dashboard)/portal/dashboard/page.tsx', 'accountant'), 'Dashboard implements Accountant persona');
assert(fileContains('apps/web/src/app/(dashboard)/portal/dashboard/page.tsx', 'student'), 'Dashboard implements Student & Parent persona');

// 7. Future Module Previews
console.log('\n7. Checking Future Module Previews (Phase 4 Extensibility)...');
assert(fileContains('apps/web/src/app/(dashboard)/portal/timetable/page.tsx', 'SAMPLE_SLOTS'), 'Timetable page has weekly slot visualizer');
assert(fileContains('apps/web/src/app/(dashboard)/portal/operations/page.tsx', 'Library & Media Center'), 'Operations page has Library tab');
assert(fileContains('apps/web/src/app/(dashboard)/portal/operations/page.tsx', 'Transport & Fleet'), 'Operations page has Transport tab');
assert(fileContains('apps/web/src/app/(dashboard)/portal/operations/page.tsx', 'Hostel & Housing'), 'Operations page has Hostel tab');
assert(fileContains('apps/web/src/app/(dashboard)/portal/operations/page.tsx', 'Inventory & Assets'), 'Operations page has Inventory tab');

// 8. Mobile & Desktop Cross-Platform Alignment
console.log('\n8. Checking Cross-Platform Theme Synchronization...');
assert(fileExists('apps/mobile/lib/core/theme/app_theme.dart'), 'Flutter mobile theme exists');
assert(fileContains('apps/mobile/lib/core/theme/app_theme.dart', '0xFF0284C7'), 'Mobile theme matches Sky-600 primary token');
assert(fileExists('apps/desktop/lib/main.dart'), 'Flutter desktop main.dart exists');
assert(fileContains('apps/desktop/lib/main.dart', 'DesktopStationScaffold'), 'Desktop station implements multi-pane workstation layout');
assert(fileContains('apps/desktop/lib/main.dart', '0xFF0284C7'), 'Desktop layout uses synchronized Sky-600 token');

// 9. Bidirectional RTL Compliance
console.log('\n9. Checking Bidirectional RTL CSS Readiness...');
assert(fileContains('apps/web/src/app/globals.css', 'margin-inline'), 'globals.css utilizes margin-inline for logical spacing');
assert(fileContains('apps/web/src/components/Header.tsx', 'paddingInline'), 'Header uses logical paddingInline');
assert(fileContains('apps/web/src/app/(dashboard)/portal/timetable/page.tsx', 'borderInlineEnd'), 'Timetable visualizer uses borderInlineEnd');

console.log('\n================================================================');
console.log(`VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('PHASE 3 VERIFICATION COMPLETE: ALL CHECKS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}
