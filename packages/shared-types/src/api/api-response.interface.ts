export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  timestamp: string;
  traceId?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  data: T[];
  meta: PaginationMeta;
  timestamp: string;
  traceId?: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: string;
  message: string;
  errors?: ApiErrorDetail[];
  timestamp: string;
  path: string;
  traceId?: string;
}
