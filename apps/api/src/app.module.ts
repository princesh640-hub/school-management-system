import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';

// Core modules
import { PrismaModule } from './core/database/prisma.module';
import { RedisModule } from './core/redis/redis.module';
import { QueueModule } from './core/queue/queue.module';
import { StorageModule } from './core/storage/storage.module';

// Domain modules
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { AuditModule } from './modules/audit/audit.module';
import { StudentsModule } from './modules/students/students.module';
import { GuardiansModule } from './modules/guardians/guardians.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { AcademicsModule } from './modules/academics/academics.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { TimetableModule } from './modules/timetable/timetable.module';
import { ExaminationsModule } from './modules/examinations/examinations.module';
import { GradingModule } from './modules/grading/grading.module';
import { FeesModule } from './modules/fees/fees.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { HrModule } from './modules/hr/hr.module';
import { LibraryModule } from './modules/library/library.module';
import { TransportModule } from './modules/transport/transport.module';
import { HostelModule } from './modules/hostel/hostel.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { ParentModule } from './modules/parent/parent.module';
import { StudentModule } from './modules/student/student.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { PrintingModule } from './modules/printing/printing.module';
import { SettingsModule } from './modules/settings/settings.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CampusesModule } from './modules/campuses/campuses.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { DesignationsModule } from './modules/designations/designations.module';
import { AdmissionsModule } from './modules/admissions/admissions.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),
    // Core infrastructure
    PrismaModule,
    RedisModule,
    QueueModule,
    StorageModule,

    // Enterprise domain modules
    HealthModule,
    OrganizationsModule,
    CampusesModule,
    DepartmentsModule,
    DesignationsModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    AuditModule,
    StudentsModule,
    GuardiansModule,
    TeachersModule,
    EmployeesModule,
    AcademicsModule,
    AttendanceModule,
    TimetableModule,
    ExaminationsModule,
    GradingModule,
    FeesModule,
    PayrollModule,
    AccountsModule,
    HrModule,
    LibraryModule,
    TransportModule,
    HostelModule,
    InventoryModule,
    ProcurementModule,
    CommunicationModule,
    ParentModule,
    StudentModule,
    TeacherModule,
    NotificationsModule,
    ReportsModule,
    DocumentsModule,
    CertificatesModule,
    PrintingModule,
    SettingsModule,
    AdmissionsModule,
    IntegrationsModule,
  ],
})
export class AppModule {}
