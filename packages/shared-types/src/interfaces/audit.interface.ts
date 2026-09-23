export interface AuditLogEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  userId?: string | null;
  action: string;
  module: string;
  resourceId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date | string;
}
