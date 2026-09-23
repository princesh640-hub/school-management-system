export interface ApiClientConfig {
  baseUrl: string;
  apiVersion?: string;
  getAccessToken?: () => Promise<string | null> | string | null;
  onUnauthorized?: () => void;
  timeoutMs?: number;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
}
