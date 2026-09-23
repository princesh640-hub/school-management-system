// =============================================================================
// Phase 4O: Student Services Service (Library, Transport, Hostel, Documents)
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { StudentAuthService } from './student-auth.service';
import {
  IStudentLibraryInfo,
  IStudentTransportInfo,
  IStudentHostelInfo,
  IStudentDocument,
} from '@school/shared-types';

@Injectable()
export class StudentServicesService {
  private readonly logger = new Logger(StudentServicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly studentAuth: StudentAuthService,
  ) {}

  /**
   * Retrieves student's active library loans, due dates, and outstanding fines.
   */
  async getLibrary(userId: string): Promise<IStudentLibraryInfo> {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);

    const member = await this.prisma.libraryMember.findFirst({
      where: {
        OR: [
          { userId: student.userId },
          { studentProfileId: student.id },
        ],
      },
      include: {
        loans: {
          where: { status: { in: ['ACTIVE', 'OVERDUE'] } },
          include: {
            copy: {
              include: {
                bookTitle: true,
              },
            },
            fines: true,
          },
        },
        fines: {
          where: { isPaid: false },
        },
      },
    });

    if (!member) {
      return {
        hasMembership: false,
        membershipNumber: null,
        activeLoans: [],
        totalOutstandingFines: 0,
      };
    }

    const now = new Date();
    const activeLoans = member.loans.map((l) => {
      const isOverdue = l.dueDate < now;
      const loanFines = l.fines
        .filter((f) => !f.isPaid)
        .reduce((sum, f) => sum + Number(f.amount), 0);

      return {
        id: l.id,
        bookTitle: l.copy.bookTitle.title,
        isbn: l.copy.bookTitle.isbn,
        borrowedDate: l.issueDate.toISOString().split('T')[0],
        dueDate: l.dueDate.toISOString().split('T')[0],
        isOverdue,
        fineAmount: loanFines,
      };
    });

    const totalOutstandingFines = member.fines.reduce(
      (sum, f) => sum + Number(f.amount),
      0,
    );

    return {
      hasMembership: true,
      membershipNumber: member.membershipNumber,
      activeLoans,
      totalOutstandingFines,
    };
  }

  /**
   * Retrieves student's assigned bus route, pickup/drop stop, scheduled times, and driver details.
   */
  async getTransport(userId: string): Promise<IStudentTransportInfo> {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);

    const assignment = await this.prisma.studentTransportAssignment.findFirst({
      where: {
        studentId: student.id,
        isActive: true,
      },
      include: {
        route: {
          include: {
            schedules: {
              where: {
                scheduleDate: { gte: new Date() },
              },
              take: 1,
              include: {
                vehicle: true,
                driver: {
                  include: {
                    user: { select: { firstName: true, lastName: true, phone: true } },
                  },
                },
              },
            },
          },
        },
        stop: true,
      },
    });

    if (!assignment) {
      return {
        hasAssignment: false,
        recentBoardings: [],
      };
    }

    const nextSchedule = assignment.route.schedules[0];

    const boardings = await this.prisma.transportBoardingEvent.findMany({
      where: { studentId: student.id },
      orderBy: { timestamp: 'desc' },
      take: 5,
      include: {
        stop: true,
      },
    });

    return {
      hasAssignment: true,
      assignment: {
        routeName: assignment.route.name,
        routeCode: assignment.route.code,
        stopName: assignment.stop?.name || null,
        pickupTime: assignment.stop?.pickupTime || null,
        dropTime: assignment.stop?.dropTime || null,
        vehicleNumber: nextSchedule?.vehicle?.registrationNumber || null,
        driverName: nextSchedule?.driver
          ? `${nextSchedule.driver.user.firstName} ${nextSchedule.driver.user.lastName}`.trim()
          : null,
        driverPhone: nextSchedule?.driver?.user?.phone || null,
      },
      recentBoardings: boardings.map((b) => ({
        date: b.timestamp.toISOString().split('T')[0],
        eventType: b.eventType as any,
        tripType: b.tripType,
        stopName: b.stop?.name || null,
        timestamp: b.timestamp.toISOString(),
      })),
    };
  }

  /**
   * Retrieves student's hostel allocation, room/bed, roll-call attendance, and outings.
   */
  async getHostel(userId: string): Promise<IStudentHostelInfo> {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);

    const allocation = await this.prisma.hostelAllocation.findFirst({
      where: {
        studentId: student.id,
        status: 'ACTIVE',
      },
      include: {
        hostel: true,
        room: true,
        bed: true,
      },
    });

    if (!allocation) {
      return {
        hasAllocation: false,
        recentAttendances: [],
        recentOutings: [],
      };
    }

    const [attendances, outings] = await Promise.all([
      this.prisma.hostelAttendance.findMany({
        where: { studentId: student.id },
        orderBy: { date: 'desc' },
        take: 7,
      }),
      this.prisma.hostelOuting.findMany({
        where: { studentId: student.id },
        orderBy: { startDate: 'desc' },
        take: 5,
      }),
    ]);

    return {
      hasAllocation: true,
      allocation: {
        hostelName: allocation.hostel.name,
        roomNumber: allocation.room.roomNumber,
        bedNumber: allocation.bed.bedNumber,
        checkInDate: allocation.startDate.toISOString().split('T')[0],
        status: allocation.status,
      },
      recentAttendances: attendances.map((a) => ({
        date: a.date.toISOString().split('T')[0],
        session: a.session,
        status: a.status,
      })),
      recentOutings: outings.map((o) => ({
        outingType: o.outingType,
        startDate: o.startDate.toISOString().split('T')[0],
        expectedReturn: o.expectedReturn.toISOString().split('T')[0],
        actualReturn: o.actualReturn ? o.actualReturn.toISOString().split('T')[0] : null,
        destination: o.destination,
        status: o.status,
      })),
    };
  }

  /**
   * Retrieves authorized, verified student documents (certificates, circulars, report cards).
   */
  async getDocuments(userId: string): Promise<IStudentDocument[]> {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);

    const docs = await this.prisma.studentDocument.findMany({
      where: {
        studentId: student.id,
        isVerified: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d) => ({
      id: d.id,
      documentType: d.documentType,
      fileName: d.fileName,
      fileKey: d.fileKey,
      sizeInBytes: d.sizeInBytes ? Number(d.sizeInBytes) : null,
      mimeType: d.mimeType,
      createdAt: d.createdAt.toISOString(),
      verifiedAt: d.verifiedAt ? d.verifiedAt.toISOString() : null,
    }));
  }
}
