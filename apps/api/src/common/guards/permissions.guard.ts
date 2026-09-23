import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole } from '@school/shared-types';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { CurrentUserPayload } from '../interfaces/current-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: CurrentUserPayload = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied: unauthenticated user');
    }

    // Super Admin has universal access
    if (user.roles && user.roles.includes(SystemRole.SUPER_ADMIN)) {
      return true;
    }

    const userPermissions = new Set(user.permissions || []);

    // Check if user has ALL required permissions for this action
    const hasAllPermissions = requiredPermissions.every((perm) => userPermissions.has(perm));

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter((perm) => !userPermissions.has(perm));
      throw new ForbiddenException(
        `Access denied: missing required permissions [${missingPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}
