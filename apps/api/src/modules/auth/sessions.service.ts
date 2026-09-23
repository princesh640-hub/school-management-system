import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async listUserSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, isRevoked: false },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        lastActiveAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async revokeSession(sessionId: string, userId: string, actorId: string) {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    const updated = await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: `Revoked by user ${actorId}`,
      },
    });

    return { message: 'Session revoked successfully', sessionId: updated.id };
  }

  async revokeAllOtherSessions(userId: string, currentSessionId?: string) {
    const where: any = { userId, isRevoked: false };
    if (currentSessionId) {
      where.id = { not: currentSessionId };
    }

    const res = await this.prisma.userSession.updateMany({
      where,
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'Revoked all other sessions',
      },
    });

    return { message: `Revoked ${res.count} active session(s)` };
  }

  async impersonate(
    targetUserId: string,
    actor: CurrentUserPayload,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!actor.roles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException('Only Super Administrators are permitted to impersonate user accounts');
    }

    const targetUser = await this.prisma.user.findFirst({
      where: { id: targetUserId, organizationId: actor.organizationId },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        userOverrides: { include: { permission: true } },
      },
    });

    if (!targetUser) {
      throw new NotFoundException(`Target user with ID ${targetUserId} not found in this organization`);
    }

    if (targetUser.status !== 'ACTIVE') {
      throw new ForbiddenException(`Cannot impersonate an account with status ${targetUser.status}`);
    }

    // Extract roles and permissions
    const roles = targetUser.userRoles.map((ur) => ur.role.code);
    const permissionSet = new Set<string>();
    targetUser.userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        permissionSet.add(rp.permission.code);
      });
    });

    targetUser.userOverrides.forEach((uo) => {
      if (uo.isGranted) {
        permissionSet.add(uo.permission.code);
      } else {
        permissionSet.delete(uo.permission.code);
      }
    });

    const payload: CurrentUserPayload & { impersonatorId: string } = {
      id: targetUser.id,
      email: targetUser.email,
      organizationId: targetUser.organizationId,
      campusId: targetUser.campusId ?? null,
      roles,
      permissions: Array.from(permissionSet),
      impersonatorId: actor.id,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET', 'dev-jwt-secret-do-not-use-in-production'),
      expiresIn: '30m', // Strictly limited 30-minute lifespan
    });

    await this.auditService.log({
      organizationId: actor.organizationId,
      campusId: targetUser.campusId,
      userId: actor.id,
      action: 'IMPERSONATE_USER',
      module: 'auth',
      resourceId: targetUser.id,
      newValues: {
        targetUser: { id: targetUser.id, email: targetUser.email },
        impersonator: { id: actor.id, email: actor.email },
        lifespan: '30m',
      },
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 1800,
      isImpersonated: true,
      impersonator: { id: actor.id, email: actor.email },
      user: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        roles,
        permissions: Array.from(permissionSet),
      },
    };
  }
}
