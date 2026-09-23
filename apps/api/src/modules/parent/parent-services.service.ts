// =============================================================================
// Phase 4N: Parent Services Service (Transport, Hostel, Library & Documents)
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ParentAuthService } from './parent-auth.service';
import {
  IParentTransportInfo,
  IParentHostelInfo,
  IParentLibraryInfo,
  IParentDocument,
} from '@school/shared-types';

@Injectable()
export class ParentServicesService {
  private readonly logger = new Logger(ParentServicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parentAuth: ParentAuthService,
  ) {}

  /**
   * Retrieves child's bus transport assignment, stops, schedule, and recent boarding events.
   * Does NOT show simulated live GPS maps when hardware GPS is not present.
   */
  async getChildTransport(
    userId: string,
    studentId: string,
  ): Promise<IParentTransportInfo> {
    const { student } = await this.parentAuth.validateGuardianStudentAccess(
      userId,
      studentId,
    );

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
        assignmentType: assignment.assignmentType,
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
   * Retrieves child's boarding hostel allocation, room/bed, roll call attendance, and outings.
   */
  async getChildHostel(
    userId: string,
    studentId: string,
  ): Promise<IParentHostelInfo> {
    const { student } = await this.parentAuth.validateGuardianStudentAccess(
      userId,
      studentId,
    );

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
   * Retrieves child's library borrowing activity, due dates, and outstanding fines.
   */
  async getChildLibrary(
    userId: string,
    studentId: string,
  ): Promise<IParentLibraryInfo> {
    const { student } = await this.parentAuth.validateGuardianStudentAccess(
      userId,
      studentId,
    );

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
   * Retrieves authorized student documents (e.g. certificates, medical clearances, report cards).
   * Excludes internal administrative notes and restricted employee memos.
   */
  async getChildDocuments(
    userId: string,
    studentId: string,
  ): Promise<IParentDocument[]> {
    const { student } = await this.parentAuth.validateGuardianStudentAccess(
      userId,
      studentId,
    );

    const docs = await this.prisma.studentDocument.findMany({
      where: { studentId: student.id },
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
