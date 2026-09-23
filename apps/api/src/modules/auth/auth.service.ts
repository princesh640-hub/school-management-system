import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { SystemRole } from '@school/shared-types';
import { PrismaService } from '../../core/database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        userOverrides: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Extract roles
    const roles: SystemRole[] = user.userRoles.map((ur) => ur.role.code as SystemRole);

    // Aggregate fine-grained permissions
    const permissionsSet = new Set<string>();
    user.userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        permissionsSet.add(rp.permission.code);
      });
    });

    // Apply explicit overrides
    user.userOverrides.forEach((override) => {
      if (override.isGranted) {
        permissionsSet.add(override.permission.code);
      } else {
        permissionsSet.delete(override.permission.code);
      }
    });

    const permissions = Array.from(permissionsSet);

    // Record last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.organizationId, user.campusId, roles, permissions);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        campusId: user.campusId,
        roles,
        permissions,
      },
      tokens,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User account invalid or deactivated');
      }

      const roles = user.userRoles.map((ur) => ur.role.code as SystemRole);
      const permissionsSet = new Set<string>();
      user.userRoles.forEach((ur) => {
        ur.role.rolePermissions.forEach((rp) => permissionsSet.add(rp.permission.code));
      });

      return this.generateTokens(
        user.id,
        user.email,
        user.organizationId,
        user.campusId,
        roles,
        Array.from(permissionsSet),
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          select: { id: true, name: true, code: true, currency: true, timezone: true },
        },
        campus: {
          select: { id: true, name: true, code: true, isMainCampus: true },
        },
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        userOverrides: {
          include: {
            permission: true,
          },
        },
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User session invalid');
    }

    const roles: SystemRole[] = user.userRoles.map((ur) => ur.role.code as SystemRole);
    const permissionsSet = new Set<string>();
    user.userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => permissionsSet.add(rp.permission.code));
    });
    user.userOverrides.forEach((override) => {
      if (override.isGranted) {
        permissionsSet.add(override.permission.code);
      } else {
        permissionsSet.delete(override.permission.code);
      }
    });

    const { passwordHash, ...sanitized } = user;
    return {
      ...sanitized,
      roles,
      permissions: Array.from(permissionsSet),
    };
  }

  async changePassword(userId: string, dto: { currentPassword: string; newPassword: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: 'Password updated successfully' };
  }

  private async generateTokens(
    userId: string,
    email: string,
    organizationId: string,
    campusId: string | null,
    roles: SystemRole[],
    permissions: string[],
  ) {
    const payload = {
      sub: userId,
      email,
      organizationId,
      campusId,
      roles,
      permissions,
    };

    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn', '15m');
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: accessExpiresIn as any,
      }),
      this.jwtService.signAsync(
        { sub: userId, organizationId },
        {
          secret: this.configService.get<string>('jwt.refreshSecret'),
          expiresIn: refreshExpiresIn as any,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 mins in seconds
      tokenType: 'Bearer' as const,
    };
  }
}
