import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@school/shared-types';

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const http = context.switchToHttp();
    const response = http.getResponse();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((data) => {
        // If data is already in standard response shape or a paginated response, keep it intact
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return data;
        }

        return {
          success: true,
          statusCode,
          data: data ?? null,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
