import * as fs from 'fs';
import * as path from 'path';

describe('Monorepo Architecture Baseline Verification', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('should have all approved monorepo root configurations', () => {
    const requiredRootFiles = [
      'package.json',
      'pnpm-workspace.yaml',
      'turbo.json',
      'tsconfig.base.json',
      '.gitignore',
      '.env.example',
      'README.md',
    ];

    requiredRootFiles.forEach((file) => {
      const filePath = path.join(rootDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should contain all 4 approved applications', () => {
    const apps = ['web', 'api', 'mobile', 'desktop'];
    apps.forEach((app) => {
      const appPath = path.join(rootDir, 'apps', app);
      expect(fs.existsSync(appPath)).toBe(true);
    });
  });

  it('should contain all 3 approved shared packages', () => {
    const packages = ['shared-types', 'validation', 'api-client'];
    packages.forEach((pkg) => {
      const pkgPath = path.join(rootDir, 'packages', pkg);
      expect(fs.existsSync(pkgPath)).toBe(true);
    });
  });

  it('should have complete infrastructure assets', () => {
    const infraFiles = [
      'docker/Dockerfile.api',
      'docker/Dockerfile.web',
      'docker/docker-compose.yml',
      'docker/docker-compose.prod.yml',
      'nginx/nginx.conf',
      'nginx/conf.d/school.conf',
      'scripts/backup-db.sh',
      'scripts/restore-db.sh',
      'scripts/init-minio.sh',
    ];

    infraFiles.forEach((file) => {
      const filePath = path.join(rootDir, 'infrastructure', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should have all 6 Architecture Decision Records (ADRs)', () => {
    const adrs = [
      'ADR-001-monorepo-strategy.md',
      'ADR-002-backend-fastify-modular-monolith.md',
      'ADR-003-database-and-multicampus-schema.md',
      'ADR-004-rbac-and-fine-grained-permissions.md',
      'ADR-005-redis-queue-worker-architecture.md',
      'ADR-006-s3-compatible-file-storage.md',
    ];

    adrs.forEach((adr) => {
      const adrFilePath = path.join(rootDir, 'docs', 'adr', adr);
      expect(fs.existsSync(adrFilePath)).toBe(true);
    });
  });

  it('should contain all 28 domain module boundaries in API', () => {
    const domains = [
      'auth', 'users', 'roles', 'permissions', 'health',
      'students', 'guardians', 'teachers', 'employees',
      'academics', 'attendance', 'timetable', 'examinations', 'grading',
      'fees', 'payroll', 'accounts', 'hr',
      'library', 'transport', 'hostel', 'inventory', 'procurement',
      'communication', 'notifications', 'reports', 'documents', 'audit', 'settings',
    ];

    domains.forEach((domain) => {
      const domainPath = path.join(rootDir, 'apps', 'api', 'src', 'modules', domain);
      expect(fs.existsSync(domainPath)).toBe(true);
    });
  });
});
