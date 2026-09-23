import { RecordStatus, Gender } from '../enums/roles.enum.js';

export interface BaseAuditEntity {
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: string | null;
  updatedBy?: string | null;
  status: RecordStatus;
}

export interface UserEntity extends BaseAuditEntity {
  id: string;
  email: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  gender?: Gender | null;
  organizationId: string;
  campusId?: string | null;
  isEmailVerified: boolean;
  lastLoginAt?: Date | string | null;
}

export interface PermissionDefinition {
  id: string;
  code: string; // e.g. 'students:read'
  module: string; // e.g. 'students'
  action: string; // e.g. 'read'
  description?: string | null;
}

export interface RoleDefinition {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isSystem: boolean;
  permissions: PermissionDefinition[];
}
