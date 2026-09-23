import { SchoolApiClient } from '@school/api-client';
import { env } from './env';

/**
 * Enterprise Web API Client Configuration
 * 
 * SECURITY ARCHITECTURE GUARANTEE:
 * - Refresh tokens are NEVER stored in localStorage or sessionStorage.
 * - Refresh tokens are maintained strictly as HttpOnly, Secure, SameSite=Strict cookies
 *   by the Fastify backend at path `/api/v1/auth`.
 * - The browser automatically includes the HttpOnly cookie when calling `/api/v1/auth/refresh`.
 * - Only the short-lived access token is held in-memory or session context.
 */
export const apiClient = new SchoolApiClient({
  baseUrl: env.apiUrl.replace(/\/api\/v1\/?$/, ''),
  apiVersion: 'v1',
  getAccessToken: () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('access_token');
    }
    return null;
  },
  onUnauthorized: async () => {
    if (typeof window !== 'undefined') {
      try {
        // Attempt silent refresh via HttpOnly cookie (automatically transmitted)
        const response = await fetch(`${env.apiUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (response.ok) {
          const json = await response.json();
          if (json.data?.accessToken) {
            sessionStorage.setItem('access_token', json.data.accessToken);
            return;
          }
        }
      } catch {
        // Refresh failed, proceed to logout
      }

      sessionStorage.removeItem('access_token');
      window.location.href = '/login';
    }
  },
});
