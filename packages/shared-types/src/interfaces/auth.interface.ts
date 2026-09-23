import { SystemRole } from '../enums/roles.enum.js';

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  campusId?: string | null;
  roles: SystemRole[];
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  campusId?: string | null;
  roles: SystemRole[];
  permissions: string[];
}

export interface LoginResponse {
  user: AuthUserSummary;
  tokens: AuthTokens;
}
