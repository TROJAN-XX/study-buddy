import type { ApiResponse } from '@study-buddy/shared';

/**
 * Base URL of the Cloudflare Worker API. When unset, the app runs in a fully
 * standalone offline-first mode and no network calls are attempted.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
export const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

export function isApiConfigured(): boolean {
  return API_BASE_URL.length > 0;
}

export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; status: number | null; error: string };

/**
 * Perform an authenticated API request and distinguish success from failure.
 *
 * Unlike the old helper (which returned `null` for any non-2xx response), this
 * exposes the failure so the offline sync queue can keep unacknowledged
 * mutations instead of silently discarding them.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  if (!isApiConfigured()) {
    return { ok: false, status: null, error: 'API not configured (offline mode)' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (API_TOKEN) {
    headers['Authorization'] = `Bearer ${API_TOKEN}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    // 204 / empty body
    const text = await response.text();
    if (!text) {
      return { ok: true, data: undefined as unknown as T, status: response.status };
    }

    let json: ApiResponse<T>;
    try {
      json = JSON.parse(text) as ApiResponse<T>;
    } catch {
      return { ok: false, status: response.status, error: 'Malformed JSON response' };
    }

    if (!json || json.success !== true || json.data === undefined) {
      return {
        ok: false,
        status: response.status,
        error: json?.error || 'Malformed API response',
      };
    }

    return { ok: true, data: json.data, status: response.status };
  } catch (error) {
    return {
      ok: false,
      status: null,
      error: error instanceof Error ? error.message : 'Network request failed',
    };
  }
}
