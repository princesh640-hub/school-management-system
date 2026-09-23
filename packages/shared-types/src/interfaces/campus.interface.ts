import { BaseAuditEntity } from './user.interface.js';

export interface OrganizationEntity extends BaseAuditEntity {
  id: string;
  name: string;
  code: string;
  domain?: string | null;
  logoUrl?: string | null;
  currency: string;
  timezone: string;
}

export interface CampusEntity extends BaseAuditEntity {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  isMainCampus: boolean;
}

export interface AcademicYearEntity extends BaseAuditEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  name: string; // e.g. "2026-2027"
  startDate: Date | string;
  endDate: Date | string;
  isCurrent: boolean;
}
