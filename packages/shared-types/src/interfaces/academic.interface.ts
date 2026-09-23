export type CalendarEventCategory =
  | 'HOLIDAY'
  | 'EXAMINATION'
  | 'EVENT'
  | 'TERM_START'
  | 'TERM_END'
  | 'STAFF_DEVELOPMENT'
  | 'OTHER';

export type EventAudience =
  | 'ALL'
  | 'STUDENTS'
  | 'TEACHERS'
  | 'PARENTS'
  | 'STAFF';

export type SubjectCategory =
  | 'CORE'
  | 'ELECTIVE'
  | 'LANGUAGE'
  | 'SCIENCE'
  | 'HUMANITIES'
  | 'COMPUTING'
  | 'CO_CURRICULAR'
  | 'LAB'
  | 'OTHER';

export type CourseEnrollmentStatus =
  | 'ACTIVE'
  | 'DROPPED'
  | 'COMPLETED';

export interface AcademicCalendarEvent {
  id: string;
  organizationId: string;
  campusId?: string | null;
  academicYearId: string;
  termId?: string | null;
  title: string;
  description?: string | null;
  category: CalendarEventCategory;
  startDate: Date | string;
  endDate: Date | string;
  isHoliday: boolean;
  targetAudience: EventAudience;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Curriculum {
  id: string;
  organizationId: string;
  campusId?: string | null;
  academicYearId: string;
  classId: string;
  name: string;
  code: string;
  version: string;
  description?: string | null;
  status: string;
  subjects?: CurriculumSubject[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CurriculumSubject {
  id: string;
  curriculumId: string;
  subjectId: string;
  isRequired: boolean;
  creditHours?: number | null;
  weeklyPeriods: number;
  orderIndex: number;
  subject?: {
    id: string;
    name: string;
    code: string;
    category?: SubjectCategory;
  };
}

export interface SubjectOffering {
  id: string;
  academicYearId: string;
  termId?: string | null;
  classId: string;
  sectionId: string;
  subjectId: string;
  primaryTeacherId?: string | null;
  weeklyPeriods: number;
  status: string;
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  primaryTeacher?: {
    id: string;
    user?: {
      firstName: string;
      lastName: string;
      email?: string;
    };
  } | null;
  section?: {
    id: string;
    name: string;
    capacity: number;
  };
  class?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface ClassTeacherAssignment {
  id: string;
  sectionId: string;
  teacherId: string;
  academicYearId: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  isCurrent: boolean;
  status: string;
  teacher?: {
    id: string;
    user?: {
      firstName: string;
      lastName: string;
      email?: string;
    };
  };
  section?: {
    id: string;
    name: string;
  };
}

export interface CourseEnrollment {
  id: string;
  enrollmentId: string;
  subjectOfferingId: string;
  status: CourseEnrollmentStatus;
  effectiveDate: Date | string;
  createdAt?: Date | string;
}

export interface AcademicOverview {
  totalYears: number;
  activeYear?: {
    id: string;
    name: string;
    startDate: Date | string;
    endDate: Date | string;
  } | null;
  totalTerms: number;
  totalClasses: number;
  totalSections: number;
  totalSubjects: number;
  totalOfferings: number;
  totalCurricula: number;
  upcomingEventsCount: number;
}
