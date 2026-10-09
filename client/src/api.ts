/* src/api.ts */
import { authStore } from './auth';

// Base URL from Vite environment variable (VITE_API_BASE_URL)
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string || '').replace(/\/*$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(
    message: string,
    status: number,
    body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Core fetch wrapper used throughout the front‑end.
 * - Prepends the configured base URL.
 * - Adds Bearer token when present.
 * - Parses JSON responses, falling back to text.
 * - Throws an error object containing `status` and `body` for non‑2xx responses.
 * - Clears the auth store on 401 so the UI can return to login; 403 remains a permission error.
 */
export async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const url = typeof input === 'string' && input.startsWith('/') ? `${BASE_URL}${input}` : input;
  const token = authStore.getToken();
  const headers: HeadersInit = {
    ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    ...(init?.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch (cause) {
    throw new ApiError(
      cause instanceof Error ? cause.message : 'Unable to connect to the server.',
      0,
      null,
    );
  }

  const contentType = response.headers.get('content-type') || '';
  let body: unknown;
  if (contentType.includes('application/json')) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  } else {
    const text = await response.text();
    body = text || null;
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
        ? body.message
        : typeof body === 'string' && body
          ? body
          : response.statusText || 'Request failed.';
    if (response.status === 401) {
      authStore.clear();
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}

// Small convenience helpers
export const apiGet = <T>(path: string, init?: RequestInit) => api<T>(path, { ...init, method: 'GET' });
export const apiPost = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data) });
export const apiPatch = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
export const apiDelete = <T>(path: string) => api<T>(path, { method: 'DELETE' });
