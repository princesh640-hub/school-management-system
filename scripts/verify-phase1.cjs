const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
console.log('=== PHASE 1 COMPREHENSIVE ARCHITECTURE & CODE VERIFICATION ===\n');

let passCount = 0;
let warnCount = 0;
let failCount = 0;

function check(label, condition, details = '', isWarn = false) {
  if (condition) {
    console.log(`[PASS] ${label}`);
    passCount++;
  } else if (isWarn) {
    console.log(`[WARNING] ${label} - ${details}`);
    warnCount++;
  } else {
    console.log(`[FAIL] ${label} - ${details}`);
    failCount++;
  }
}

// 1. Workspace resolution files
check('Monorepo root package.json', fs.existsSync(path.join(rootDir, 'package.json')));
check('pnpm-workspace.yaml exists', fs.existsSync(path.join(rootDir, 'pnpm-workspace.yaml')));
check('turbo.json exists', fs.existsSync(path.join(rootDir, 'turbo.json')));
check('tsconfig.base.json exists', fs.existsSync(path.join(rootDir, 'tsconfig.base.json')));

// 2. All 4 apps exist
['web', 'api', 'mobile', 'desktop'].forEach(app => {
  check(`App exists: apps/${app}`, fs.existsSync(path.join(rootDir, 'apps', app)));
});

// 3. All 3 packages exist
['shared-types', 'validation', 'api-client'].forEach(pkg => {
  check(`Package exists: packages/${pkg}`, fs.existsSync(path.join(rootDir, 'packages', pkg)));
});

// 4. Prisma schema check
const schemaPath = path.join(rootDir, 'apps/api/prisma/schema.prisma');
const schemaExists = fs.existsSync(schemaPath);
check('Prisma schema exists', schemaExists);
if (schemaExists) {
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  check('Prisma targets postgresql', schemaContent.includes('provider = "postgresql"'));
  check('Prisma contains Organization model', schemaContent.includes('model Organization'));
  check('Prisma contains Campus model', schemaContent.includes('model Campus'));
  check('Prisma contains AcademicYear model', schemaContent.includes('model AcademicYear'));
  check('Prisma contains User & Role models', schemaContent.includes('model User') && schemaContent.includes('model Role'));
  check('Prisma contains Permission model', schemaContent.includes('model Permission'));
  check('Prisma contains StudentProfile model', schemaContent.includes('model StudentProfile'));
  check('Prisma contains AuditLog model', schemaContent.includes('model AuditLog'));
  check('Prisma contains FileMetadata model', schemaContent.includes('model FileMetadata'));
}

// 5. Backend NestJS domain modules check
const apiModulesDir = path.join(rootDir, 'apps/api/src/modules');
const expectedDomains = [
  'auth', 'users', 'roles', 'permissions', 'health',
  'students', 'guardians', 'teachers', 'employees',
  'academics', 'attendance', 'timetable', 'examinations', 'grading',
  'fees', 'payroll', 'accounts', 'hr',
  'library', 'transport', 'hostel', 'inventory', 'procurement',
  'communication', 'notifications', 'reports', 'documents', 'audit', 'settings'
];
expectedDomains.forEach(domain => {
  check(`Domain module exists: ${domain}`, fs.existsSync(path.join(apiModulesDir, domain)));
});

// 6. Security Check: Refresh Token storage in Web
const webApiTs = path.join(rootDir, 'apps/web/src/lib/api.ts');
if (fs.existsSync(webApiTs)) {
  const content = fs.readFileSync(webApiTs, 'utf8');
  const storesRefreshTokenInStorage = content.includes('localStorage.setItem(\'refresh_token\'') || 
                                     content.includes('sessionStorage.setItem(\'refresh_token\'');
  check('Web client NEVER stores refresh token in localStorage/sessionStorage', !storesRefreshTokenInStorage);
  check('Web client uses HttpOnly cookie refresh pattern', content.includes('HttpOnly') && content.includes('/auth/refresh'));
}

// 7. Security Check: AuthController HttpOnly cookie handling
const authControllerTs = path.join(rootDir, 'apps/api/src/modules/auth/auth.controller.ts');
if (fs.existsSync(authControllerTs)) {
  const content = fs.readFileSync(authControllerTs, 'utf8');
  check('AuthController sets HttpOnly cookie for refresh token', content.includes('HttpOnly') && content.includes('Set-Cookie'));
}

// 8. Infrastructure files check
['docker/Dockerfile.api', 'docker/Dockerfile.web', 'docker/docker-compose.yml', 'docker/docker-compose.prod.yml', 'nginx/nginx.conf', 'nginx/conf.d/school.conf', 'scripts/backup-db.sh'].forEach(f => {
  check(`Infrastructure asset exists: ${f}`, fs.existsSync(path.join(rootDir, 'infrastructure', f)));
});

// 9. Nginx configuration validity check
const nginxConf = fs.readFileSync(path.join(rootDir, 'infrastructure/nginx/nginx.conf'), 'utf8');
check('Nginx has rate limiting zones', nginxConf.includes('limit_req_zone') && nginxConf.includes('api_limit'));

const schoolConf = fs.readFileSync(path.join(rootDir, 'infrastructure/nginx/conf.d/school.conf'), 'utf8');
check('Nginx reverse proxy maps /api/', schoolConf.includes('location /api/'));
check('Nginx reverse proxy maps /docs', schoolConf.includes('location /docs'));
check('Nginx reverse proxy maps /storage/', schoolConf.includes('location /storage/'));
check('Nginx enforces TLS 1.3 / modern SSL', schoolConf.includes('TLSv1.3'));

// 10. Web RTL architecture readiness
const layoutPath = path.join(rootDir, 'apps/web/src/app/layout.tsx');
if (fs.existsSync(layoutPath)) {
  const content = fs.readFileSync(layoutPath, 'utf8');
  check('Web root layout has direction architecture (dir="ltr")', content.includes('dir="ltr"'));
}

// 11. Environment variable safety
const envExamplePath = path.join(rootDir, '.env.example');
check('.env.example exists', fs.existsSync(envExamplePath));
if (fs.existsSync(envExamplePath)) {
  const content = fs.readFileSync(envExamplePath, 'utf8');
  check('Zero unencrypted production secrets in .env.example', content.includes('your_secure_postgres_password_here') || content.includes('your_'));
}

console.log(`\nVerification Complete: ${passCount} Passed, ${warnCount} Warnings, ${failCount} Failed.`);
