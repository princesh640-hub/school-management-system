import { FastifyRequest } from 'fastify';
import { CurrentUserPayload } from './current-user.interface';

export interface AuthenticatedRequest extends FastifyRequest {
  user: CurrentUserPayload;
}
