// =============================================================================
// Phase 4R: Report Execution Service (Query & Aggregation Engine)
// =============================================================================
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ReportRegistryService } from './report-registry.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import {
  IReportExecuteDto,
  IReportResult,
  IReportColumnDefinition,
} from '@school/shared-types';

@Injectable()
export class ReportExecutionService {
  private readonly logger = new Logger(ReportExecutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ReportRegistryService,
  ) {}

  async executeReport(user: CurrentUserPayload, dto: IReportExecuteDto): Promise<IReportResult> {
    const startTime = Date.now();
    const def = this.registry.getReportDefinition(dto.reportKey);

    const organizationId = user.organizationId;
    const campusId = dto.campusId || user.campusId || undefined;
    const page = Math.max(1, dto.page || 1);
    const limit = Math.min(100, Math.max(1, dto.limit || 20));
    const skip = (page - 1) * limit;

    let resultData: Record<string, any>[] = [];
    let totalCount = 0;
    let summary: Record<string, any> = {};
    let totals: Record<string, any> | undefined;

    switch (dto.reportKey) {
      // -----------------------------------------------------------------------
      // 1. STUDENTS
      // -----------------------------------------------------------------------
      case 'STUDENT_MASTER': {
        const where: any = {
          user: { organizationId },
          ...(campusId ? { campusId } : {}),
          ...(dto.filters?.status ? { user: { status: dto.filters.status, organizationId } } : {}),
        };

        if (dto.filters?.classId || dto.filters?.sectionId) {
          where.enrollments = {
            some: {
              status: 'ACTIVE',
              ...(dto.filters?.sectionId ? { sectionId: dto.filters.sectionId } : {}),
              ...(dto.filters?.classId ? { section: { classId: dto.filters.classId } } : {}),
            },
          };
        }

        const [records, count] = await Promise.all([
          this.prisma.studentProfile.findMany({
            where,
            include: {
              user: { select: { firstName: true, lastName: true, email: true, status: true } },
              campus: { select: { name: true } },
              enrollments: {
                where: { status: 'ACTIVE' },
                include: { section: { include: { class: true } } },
              },
            },
            orderBy: { admissionNumber: 'asc' },
            skip,
            take: limit,
          }),
          this.prisma.studentProfile.count({ where }),
        ]);

        totalCount = count;
        resultData = records.map((s) => ({
          id: s.id,
          admissionNumber: s.admissionNumber,
          studentName: `${s.user.firstName} ${s.user.lastName}`,
          campusName: s.campus?.name || 'Main Campus',
          className: s.enrollments[0]?.section?.class?.name || 'Unassigned',
          sectionName: s.enrollments[0]?.section?.name || 'Unassigned',
          gender: s.gender || 'N/A',
          email: s.user.email,
          status: s.user.status,
        }));
        summary = { totalStudents: count, activeStudents: records.filter((r) => r.user.status === 'ACTIVE').length };
        break;
      }

      case 'STUDENT_ADMISSIONS': {
        const where: any = {
          organizationId,
          ...(campusId ? { campusId } : {}),
          ...(dto.filters?.startDate && dto.filters?.endDate
            ? { createdAt: { gte: new Date(dto.filters.startDate), lte: new Date(dto.filters.endDate) } }
            : {}),
        };

        const [records, count] = await Promise.all([
          this.prisma.admissionApplication.findMany({
            where,
            include: { appliedClass: true },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          this.prisma.admissionApplication.count({ where }),
        ]);

        totalCount = count;
        resultData = records.map((a) => ({
          id: a.id,
          applicationNumber: a.applicationNumber,
          applicantName: `${a.firstName} ${a.lastName}`,
          appliedClass: a.appliedClass?.name || 'General',
          submissionDate: a.createdAt.toISOString().split('T')[0],
          admissionStatus: a.status,
        }));
        summary = { totalApplications: count };
        break;
      }

      case 'STUDENT_DEMOGRAPHICS': {
        const students = await this.prisma.studentProfile.findMany({
          where: { user: { organizationId }, ...(campusId ? { campusId } : {}) },
          select: { gender: true },
        });

        const total = students.length;
        const male = students.filter((s) => s.gender?.toUpperCase() === 'MALE').length;
        const female = students.filter((s) => s.gender?.toUpperCase() === 'FEMALE').length;
        const other = total - (male + female);

        totalCount = 3;
        resultData = [
          { groupKey: 'Male Students', maleCount: male, femaleCount: 0, totalCount: male, percentage: total > 0 ? Math.round((male / total) * 100) : 0 },
          { groupKey: 'Female Students', maleCount: 0, femaleCount: female, totalCount: female, percentage: total > 0 ? Math.round((female / total) * 100) : 0 },
          { groupKey: 'Other / Unspecified', maleCount: 0, femaleCount: 0, totalCount: other, percentage: total > 0 ? Math.round((other / total) * 100) : 0 },
        ];
        summary = { totalCohort: total, malePercentage: total > 0 ? Math.round((male / total) * 100) : 0, femalePercentage: total > 0 ? Math.round((female / total) * 100) : 0 };
        break;
      }

      // -----------------------------------------------------------------------
      // 2. ACADEMICS
      // -----------------------------------------------------------------------
      case 'CLASS_ENROLLMENT': {
        const sections = await this.prisma.section.findMany({
          where: {
            class: { organizationId },
            ...(dto.filters?.classId ? { classId: dto.filters.classId } : {}),
          },
          include: {
            class: true,
            enrollments: { where: { status: 'ACTIVE' } },
            classTeachers: { where: { isPrimary: true }, include: { teacher: { include: { user: true } } } },
          },
          orderBy: { class: { name: 'asc' } },
          skip,
          take: limit,
        });

        const count = await this.prisma.section.count({
          where: { class: { organizationId } },
        });

        totalCount = count;
        resultData = sections.map((sec) => {
          const enrolled = sec.enrollments.length;
          const cap = sec.maxCapacity || 40;
          const primaryTeacher = sec.classTeachers[0]?.teacher?.user
            ? `${sec.classTeachers[0].teacher.user.firstName} ${sec.classTeachers[0].teacher.user.lastName}`
            : 'Unassigned';

          return {
            className: sec.class.name,
            sectionName: sec.name,
            enrolledCount: enrolled,
            maxCapacity: cap,
            utilizationRate: Math.round((enrolled / cap) * 100),
            classTeacher: primaryTeacher,
          };
        });
        break;
      }

      case 'TEACHING_LOAD': {
        const teachers = await this.prisma.teacherProfile.findMany({
          where: { user: { organizationId } },
          include: {
            user: { select: { firstName: true, lastName: true } },
            employeeProfile: { select: { employeeNumber: true, department: { select: { name: true } } } },
            subjectTeachers: true,
            classTeacherAssignments: true,
          },
          orderBy: { user: { lastName: 'asc' } },
          skip,
          take: limit,
        });

        totalCount = await this.prisma.teacherProfile.count({ where: { user: { organizationId } } });
        resultData = teachers.map((t) => ({
          teacherName: `${t.user.firstName} ${t.user.lastName}`,
          employeeNumber: t.employeeProfile?.employeeNumber || 'TCH',
          department: t.employeeProfile?.department?.name || 'Academic Faculty',
          subjectsAssigned: t.subjectTeachers.length,
          sectionsCount: t.classTeacherAssignments.length,
          weeklySlots: t.subjectTeachers.length * 4,
        }));
        break;
      }

      // -----------------------------------------------------------------------
      // 3. ATTENDANCE
      // -----------------------------------------------------------------------
      case 'DAILY_ATTENDANCE_SUMMARY': {
        const targetDate = dto.filters?.date ? new Date(dto.filters.date) : new Date();
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

        const sections = await this.prisma.section.findMany({
          where: { class: { organizationId } },
          include: {
            class: true,
            enrollments: { where: { status: 'ACTIVE' } },
            attendanceRecords: { where: { date: { gte: startOfDay, lte: endOfDay } } },
          },
          skip,
          take: limit,
        });

        totalCount = await this.prisma.section.count({ where: { class: { organizationId } } });
        resultData = sections.map((sec) => {
          const totalStudents = sec.enrollments.length;
          const present = sec.attendanceRecords.filter((r) => r.status === 'PRESENT').length;
          const absent = sec.attendanceRecords.filter((r) => r.status === 'ABSENT').length;
          const late = sec.attendanceRecords.filter((r) => r.status === 'LATE').length;
          const rate = totalStudents > 0 ? Math.round(((present + late) / totalStudents) * 100) : 100;

          return {
            className: sec.class.name,
            sectionName: sec.name,
            totalStudents,
            presentCount: present,
            absentCount: absent,
            lateCount: late,
            rate,
          };
        });
        break;
      }

      case 'ABSENTEEISM_ALERTS': {
        const threshold = Number(dto.filters?.threshold || 75);
        const students = await this.prisma.studentProfile.findMany({
          where: { user: { organizationId }, ...(campusId ? { campusId } : {}) },
          include: {
            user: { select: { firstName: true, lastName: true } },
            enrollments: { where: { status: 'ACTIVE' }, include: { section: { include: { class: true } } } },
            attendanceRecords: true,
          },
          take: 100,
        });

        const alertList: any[] = [];
        students.forEach((s) => {
          const totalRecords = s.attendanceRecords.length;
          if (totalRecords >= 5) {
            const present = s.attendanceRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
            const rate = Math.round((present / totalRecords) * 100);
            if (rate < threshold) {
              alertList.push({
                admissionNumber: s.admissionNumber,
                studentName: `${s.user.firstName} ${s.user.lastName}`,
                className: s.enrollments[0]?.section?.class?.name || 'General',
                sectionName: s.enrollments[0]?.section?.name || 'Section A',
                totalDays: totalRecords,
                presentDays: present,
                attendanceRate: rate,
                riskLevel: rate < 60 ? 'CRITICAL' : 'WARNING',
              });
            }
          }
        });

        totalCount = alertList.length;
        resultData = alertList.slice(skip, skip + limit);
        summary = { totalAtRisk: alertList.length, thresholdApplied: threshold };
        break;
      }

      // -----------------------------------------------------------------------
      // 4. EXAMINATIONS
      // -----------------------------------------------------------------------
      case 'EXAM_RESULTS_SUMMARY': {
        const results = await this.prisma.examResult.findMany({
          where: { examSchedule: { examSession: { organizationId } } },
          include: {
            examSchedule: {
              include: {
                subjectOffering: { include: { subject: true, section: { include: { class: true } } } },
              },
            },
          },
          skip,
          take: limit,
        });

        totalCount = results.length;
        resultData = results.map((r) => ({
          subjectName: r.examSchedule?.subjectOffering?.subject?.name || 'Academic Subject',
          className: r.examSchedule?.subjectOffering?.section?.class?.name || 'General',
          studentsAppeared: 1,
          studentsPassed: Number(r.marksObtained || 0) >= 40 ? 1 : 0,
          averageMarks: Number(r.marksObtained || 0),
          passRate: Number(r.marksObtained || 0) >= 40 ? 100 : 0,
        }));
        break;
      }

      case 'PENDING_MARKS_AUDIT': {
        const schedules = await this.prisma.examSchedule.findMany({
          where: { examSession: { organizationId } },
          include: {
            examSession: true,
            subjectOffering: {
              include: {
                subject: true,
                section: true,
                subjectTeachers: { where: { isPrimary: true }, include: { teacher: { include: { user: true } } } },
              },
            },
            examResults: true,
          },
          skip,
          take: limit,
        });

        totalCount = schedules.length;
        resultData = schedules.map((sch) => {
          const teacher = sch.subjectOffering?.subjectTeachers[0]?.teacher?.user;
          const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned';

          return {
            examTitle: sch.examSession?.name || 'Term Exam',
            subjectName: sch.subjectOffering?.subject?.name || 'Subject',
            sectionName: sch.subjectOffering?.section?.name || 'Section A',
            assignedTeacher: teacherName,
            pendingCount: Math.max(0, 30 - sch.examResults.length),
            status: sch.examResults.length > 0 ? 'PARTIAL' : 'PENDING',
          };
        });
        break;
      }

      // -----------------------------------------------------------------------
      // 5. FINANCE
      // -----------------------------------------------------------------------
      case 'FEE_DEMAND_STATEMENT': {
        const where: any = {
          academicYear: { organizationId },
          ...(dto.filters?.status ? { status: dto.filters.status } : {}),
        };

        const [invoices, count] = await Promise.all([
          this.prisma.feeInvoice.findMany({
            where,
            include: {
              student: {
                include: {
                  user: { select: { firstName: true, lastName: true } },
                  enrollments: { where: { status: 'ACTIVE' }, include: { section: { include: { class: true } } } },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          this.prisma.feeInvoice.count({ where }),
        ]);

        totalCount = count;
        resultData = invoices.map((inv) => {
          const amt = Number(inv.amount);
          const paid = Number(inv.paidAmount);
          const student = inv.student;
          return {
            invoiceNumber: inv.invoiceNumber,
            studentName: student?.user ? `${student.user.firstName} ${student.user.lastName}` : 'Student',
            className: student?.enrollments[0]?.section?.class?.name || 'Standard',
            totalAmount: amt,
            paidAmount: paid,
            balance: amt - paid,
            dueDate: inv.dueDate.toISOString().split('T')[0],
            status: inv.status,
          };
        });
        break;
      }

      case 'FEE_COLLECTION_LEDGER': {
        const where: any = { organizationId };
        if (dto.filters?.startDate && dto.filters?.endDate) {
          where.createdAt = { gte: new Date(dto.filters.startDate), lte: new Date(dto.filters.endDate) };
        }

        const [payments, count] = await Promise.all([
          this.prisma.paymentTransaction.findMany({
            where,
            include: {
              feeInvoice: {
                include: {
                  student: { include: { user: { select: { firstName: true, lastName: true } } } },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          this.prisma.paymentTransaction.count({ where }),
        ]);

        totalCount = count;
        let sum = 0;
        resultData = payments.map((p) => {
          const amt = Number(p.amount);
          sum += amt;
          const student = p.feeInvoice?.student;
          return {
            receiptNumber: p.receiptNumber || `RCP-${p.id.substring(0, 8).toUpperCase()}`,
            studentName: student?.user ? `${student.user.firstName} ${student.user.lastName}` : 'Student',
            amount: amt,
            paymentMethod: p.paymentMethod || 'CASH',
            paymentDate: p.createdAt.toISOString().split('T')[0],
            cashierName: p.cashierShiftId ? 'Staff Cashier' : 'Online Gateway',
          };
        });
        summary = { totalCollected: sum, paymentRecordsCount: count };
        totals = { amount: sum };
        break;
      }

      case 'OUTSTANDING_BALANCES': {
        const where: any = {
          academicYear: { organizationId },
          status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        };

        const [invoices, count] = await Promise.all([
          this.prisma.feeInvoice.findMany({
            where,
            include: {
              student: {
                include: {
                  user: { select: { firstName: true, lastName: true, phone: true } },
                  enrollments: { where: { status: 'ACTIVE' }, include: { section: { include: { class: true } } } },
                },
              },
            },
            skip,
            take: limit,
          }),
          this.prisma.feeInvoice.count({ where }),
        ]);

        totalCount = count;
        resultData = invoices.map((inv) => {
          const amt = Number(inv.amount);
          const paid = Number(inv.paidAmount);
          const overdue = amt - paid;
          const daysOverdue = Math.max(0, Math.floor((Date.now() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)));

          return {
            admissionNumber: inv.student?.admissionNumber || 'ADM',
            studentName: inv.student?.user ? `${inv.student.user.firstName} ${inv.student.user.lastName}` : 'Student',
            className: inv.student?.enrollments[0]?.section?.class?.name || 'Class',
            guardianContact: inv.student?.user?.phone || 'Contact Office',
            overdueAmount: overdue,
            daysOverdue,
          };
        });
        break;
      }

      // -----------------------------------------------------------------------
      // 6. HR & PAYROLL
      // -----------------------------------------------------------------------
      case 'EMPLOYEE_MASTER': {
        const where: any = {
          user: { organizationId },
          ...(dto.filters?.departmentId ? { departmentId: dto.filters.departmentId } : {}),
        };

        const [employees, count] = await Promise.all([
          this.prisma.employeeProfile.findMany({
            where,
            include: {
              user: { select: { firstName: true, lastName: true, status: true } },
              department: true,
              designation: true,
            },
            skip,
            take: limit,
          }),
          this.prisma.employeeProfile.count({ where }),
        ]);

        totalCount = count;
        resultData = employees.map((e) => ({
          employeeNumber: e.employeeNumber,
          fullName: `${e.user.firstName} ${e.user.lastName}`,
          department: e.department?.name || 'General',
          designation: e.designation?.title || 'Staff',
          joiningDate: e.hireDate ? e.hireDate.toISOString().split('T')[0] : '—',
          status: e.user.status,
        }));
        break;
      }

      case 'PAYROLL_SUMMARY': {
        const payslips = await this.prisma.payslip.findMany({
          where: { organizationId },
          include: {
            employee: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        });

        totalCount = await this.prisma.payslip.count({ where: { organizationId } });
        resultData = payslips.map((p) => ({
          payrollPeriod: p.createdAt.toISOString().substring(0, 7),
          employeeName: p.employee?.user ? `${p.employee.user.firstName} ${p.employee.user.lastName}` : 'Employee',
          grossPay: Number(p.grossPay || 0),
          totalDeductions: Number(p.totalDeductions || 0),
          netPay: Number(p.netPay || 0),
          status: p.status,
        }));
        break;
      }

      // -----------------------------------------------------------------------
      // 7. LIBRARY
      // -----------------------------------------------------------------------
      case 'LIBRARY_CIRCULATION': {
        const loans = await this.prisma.bookLoan.findMany({
          where: { organizationId },
          include: {
            bookCopy: { include: { title: true } },
            member: { include: { user: true } },
          },
          skip,
          take: limit,
        });

        totalCount = await this.prisma.bookLoan.count({ where: { organizationId } });
        resultData = loans.map((l) => ({
          loanNumber: l.loanNumber,
          bookTitle: l.bookCopy?.title?.title || 'Library Book',
          accessionNumber: l.bookCopy?.accessionNumber || 'ACC',
          borrowerName: l.member?.user ? `${l.member.user.firstName} ${l.member.user.lastName}` : 'Patron',
          borrowerType: l.member?.memberType || 'STUDENT',
          issueDate: l.issuedDate.toISOString().split('T')[0],
          dueDate: l.dueDate.toISOString().split('T')[0],
          loanStatus: l.status,
        }));
        break;
      }

      // -----------------------------------------------------------------------
      // 8. TRANSPORT
      // -----------------------------------------------------------------------
      case 'FLEET_UTILIZATION': {
        const vehicles = await this.prisma.vehicle.findMany({
          where: { organizationId },
          include: {
            studentAssignments: { where: { status: 'ACTIVE' } },
            driver: { include: { user: true } },
          },
          skip,
          take: limit,
        });

        totalCount = vehicles.length;
        resultData = vehicles.map((v) => {
          const cap = v.capacity || 30;
          const assigned = v.studentAssignments.length;
          return {
            registrationNumber: v.registrationNumber,
            vehicleType: v.vehicleType || 'BUS',
            capacity: cap,
            assignedStudents: assigned,
            occupancyRate: Math.round((assigned / cap) * 100),
            driverName: v.driver?.user ? `${v.driver.user.firstName} ${v.driver.user.lastName}` : 'Assigned Staff',
          };
        });
        break;
      }

      // -----------------------------------------------------------------------
      // 9. HOSTEL
      // -----------------------------------------------------------------------
      case 'HOSTEL_OCCUPANCY': {
        const rooms = await this.prisma.hostelRoom.findMany({
          where: { hostel: { organizationId } },
          include: { hostel: true, beds: true },
          skip,
          take: limit,
        });

        totalCount = rooms.length;
        resultData = rooms.map((r) => {
          const totalBeds = r.beds.length;
          const occupied = r.beds.filter((b) => b.status === 'OCCUPIED').length;
          return {
            hostelName: r.hostel?.name || 'Residential Hall',
            roomNumber: r.roomNumber,
            totalBeds,
            occupiedBeds: occupied,
            availableBeds: totalBeds - occupied,
            occupancyRate: totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0,
          };
        });
        break;
      }

      // -----------------------------------------------------------------------
      // 10. INVENTORY & PROCUREMENT
      // -----------------------------------------------------------------------
      case 'STOCK_POSITION': {
        const items = await this.prisma.item.findMany({
          where: { organizationId },
          include: { category: true },
          skip,
          take: limit,
        });

        totalCount = items.length;
        resultData = items.map((i) => {
          const qty = Number(i.totalQuantity || 0);
          const reorder = Number(i.reorderLevel || 10);
          return {
            itemCode: i.code,
            itemName: i.name,
            category: i.category?.name || 'Supplies',
            currentQuantity: qty,
            reorderLevel: reorder,
            stockStatus: qty <= reorder ? 'LOW_STOCK' : 'SUFFICIENT',
          };
        });
        break;
      }

      // -----------------------------------------------------------------------
      // 11. COMMUNICATION
      // -----------------------------------------------------------------------
      case 'NOTIFICATION_DELIVERY_AUDIT': {
        const deliveries = await this.prisma.notificationDelivery.groupBy({
          by: ['channel', 'status'],
          where: { notification: { organizationId } },
          _count: { id: true },
        });

        const channels = ['EMAIL', 'SMS', 'PUSH', 'WHATSAPP'];
        resultData = channels.map((ch) => {
          const delivered = deliveries.find((d) => d.channel === ch && d.status === 'DELIVERED')?._count.id || 0;
          const failed = deliveries.find((d) => d.channel === ch && d.status === 'FAILED')?._count.id || 0;
          const total = delivered + failed;

          return {
            channel: ch,
            totalSent: total,
            deliveredCount: delivered,
            failedCount: failed,
            successRate: total > 0 ? Math.round((delivered / total) * 100) : 100,
          };
        });
        totalCount = channels.length;
        break;
      }

      // -----------------------------------------------------------------------
      // 12. DOCUMENTS & CERTIFICATES
      // -----------------------------------------------------------------------
      case 'ISSUED_CERTIFICATES_LEDGER': {
        const certs = await this.prisma.issuedCertificate.findMany({
          where: { organizationId },
          include: { certificateType: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        });

        totalCount = await this.prisma.issuedCertificate.count({ where: { organizationId } });
        resultData = certs.map((c) => ({
          certificateNumber: c.certificateNumber,
          certificateType: c.certificateType?.name || 'Certificate',
          recipientName: c.recipientName,
          issuedDate: c.issueDate.toISOString().split('T')[0],
          verificationReference: c.verificationReference,
          status: c.status,
        }));
        break;
      }

      case 'EXPIRING_DOCUMENTS_ALERT': {
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const docs = await this.prisma.institutionalDocument.findMany({
          where: {
            organizationId,
            expiryDate: { lte: thirtyDaysFromNow },
          },
          include: { category: true },
          skip,
          take: limit,
        });

        totalCount = docs.length;
        resultData = docs.map((d) => {
          const daysRemaining = d.expiryDate
            ? Math.round((d.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : 0;

          return {
            documentNumber: d.documentNumber,
            title: d.title,
            category: d.category?.name || 'General',
            entityName: d.entityType ? `${d.entityType}: ${d.entityName || d.entityId}` : 'Institution-wide',
            expiryDate: d.expiryDate ? d.expiryDate.toISOString().split('T')[0] : '—',
            daysRemaining,
          };
        });
        break;
      }

      default:
        throw new BadRequestException(`Unsupported report execution key: ${dto.reportKey}`);
    }

    const executionTimeMs = Date.now() - startTime;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      metadata: {
        reportKey: def.key,
        name: def.name,
        category: def.category,
        generatedAt: new Date().toISOString(),
        generatedBy: (user as any).userId || user.id,
        filtersApplied: dto.filters || {},
        totalRecords: totalCount,
        executionTimeMs,
      },
      summary,
      columns: def.defaultColumns,
      data: resultData,
      totals,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
      },
    };
  }
}
