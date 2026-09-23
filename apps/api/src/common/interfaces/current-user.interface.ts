import { SystemRole } from '@school/shared-types';

export interface CurrentUserPayload {
  id: string;
  email: string;
  organizationId: string;
  campusId?: string | null;
  roles: SystemRole[];
  permissions: string[];
}
