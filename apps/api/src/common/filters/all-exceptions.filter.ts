import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiErrorResponse } from '@school/shared-types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let errors: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res: any = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        error = exception.name;
      } else if (typeof res === 'object') {
        message = res.message || exception.message;
        error = res.error || exception.name;
        if (Array.isArray(res.message)) {
          // Validation error list from class-validator
          errors = res.message;
          message = 'Validation failed';
          error = 'VALIDATION_ERROR';
        }
      }
    } else if (exception instanceof Error) {
      const isProduction = process.env.NODE_ENV === 'production';
      message = isProduction
        ? 'An unexpected internal server error occurred. Please contact institutional support.'
        : exception.message;
      error = 'INTERNAL_ERROR';
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
    }

    // Map HTTP status to standardized category if error is generic
    if (status === HttpStatus.UNAUTHORIZED) error = 'UNAUTHORIZED';
    else if (status === HttpStatus.FORBIDDEN) error = 'FORBIDDEN';
    else if (status === HttpStatus.NOT_FOUND) error = 'NOT_FOUND';
    else if (status === HttpStatus.CONFLICT) error = 'CONFLICT';
    else if (status === HttpStatus.TOO_MANY_REQUESTS) error = 'RATE_LIMITED';
    else if (status >= 500 && process.env.NODE_ENV === 'production') {
      message = 'An unexpected internal server error occurred. Please contact institutional support.';
      error = 'INTERNAL_ERROR';
    }

    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const errorResponse: ApiErrorResponse & { correlationId?: string } = {
      success: false,
      statusCode: status,
      error,
      message,
      errors: errors ? errors : undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
    };

    response.status(status).send(errorResponse);
  }
}
