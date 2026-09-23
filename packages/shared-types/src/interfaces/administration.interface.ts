import { BaseAuditEntity } from './user.interface.js';

export type UserLifecycleAction = 'ACTIVATE' | 'DEACTIVATE' | 'SUSPEND' | 'RESTORE' | 'ARCHIVE';

export interface UserLifecycleDto {
  action: UserLifecycleAction;
  reason?: string;
}

export interface DesignationEntity extends BaseAuditEntity {
  id: string;
  organizationId: string;
  departmentId?: string | null;
  title: string;
  code: string;
  description?: string | null;
}

export interface TermEntity extends BaseAuditEntity {
  id: string;
  academicYearId: string;
  name: string;
  code: string;
  startDate: Date | string;
  endDate: Date | string;
  isCurrent: boolean;
}

export interface UserSessionEntity {
  id: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  lastActiveAt: Date | string;
  expiresAt: Date | string;
  isRevoked: boolean;
  revokedAt?: Date | string | null;
  revokedReason?: string | null;
  createdAt: Date | string;
}
