import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole } from '@school/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { CurrentUserPayload } from '../interfaces/current-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: CurrentUserPayload = request.user;

    if (!user || !user.roles) {
      throw new ForbiddenException('Access denied: user roles not determined');
    }

    // Super Admin has unrestricted role access
    if (user.roles.includes(SystemRole.SUPER_ADMIN)) {
      return true;
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException(`Access denied: required role (${requiredRoles.join(', ')})`);
    }

    return true;
  }
}
