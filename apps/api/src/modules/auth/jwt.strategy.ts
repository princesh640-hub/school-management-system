import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@school/shared-types';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret', 'dev_jwt_access_secret_do_not_use_in_prod_12345678'),
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUserPayload> {
    if (!payload.sub || !payload.organizationId) {
      throw new UnauthorizedException('Invalid token claims');
    }

    return {
      id: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId,
      campusId: payload.campusId,
      roles: payload.roles,
      permissions: payload.permissions,
    };
  }
}
