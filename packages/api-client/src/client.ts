import { ApiResponse, PaginatedResponse } from '@school/shared-types';
import { ApiClientConfig, RequestOptions } from './types.js';

export class SchoolApiClient {
  private readonly baseUrl: string;
  private readonly apiVersion: string;
  private readonly getAccessToken?: () => Promise<string | null> | string | null;
  private readonly onUnauthorized?: () => void;
  private readonly timeoutMs: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiVersion = config.apiVersion ?? 'v1';
    this.getAccessToken = config.getAccessToken;
    this.onUnauthorized = config.onUnauthorized;
    this.timeoutMs = config.timeoutMs ?? 15000;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>): string {
    const cleanPath = path.replace(/^\/+/, '');
    const fullPath = cleanPath.startsWith('api/')
      ? `${this.baseUrl}/${cleanPath}`
      : `${this.baseUrl}/api/${this.apiVersion}/${cleanPath}`;

    const url = new URL(fullPath);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  public async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, options.params);
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    headers.set('Accept', 'application/json');

    if (!options.skipAuth && this.getAccessToken) {
      const token = await this.getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        credentials: options.credentials ?? 'include',
        ...options,
        headers,
        signal: controller.signal,
      });

      if (response.status === 401 && this.onUnauthorized) {
        this.onUnauthorized();
      }

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || `API request failed with status ${response.status}`);
      }

      return json as ApiResponse<T>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public async get<T = unknown>(path: string, params?: Record<string, unknown>, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET', params: params as any });
  }

  public async getPaginated<T = unknown>(path: string, params?: Record<string, unknown>, options?: RequestOptions): Promise<PaginatedResponse<T>> {
    const res = await this.request<T[]>(path, { ...options, method: 'GET', params: params as any });
    return res as unknown as PaginatedResponse<T>;
  }

  public async post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async patch<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async delete<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}
