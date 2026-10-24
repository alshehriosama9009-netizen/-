/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const API_BASE = 'https://tahaddi-server.onrender.com/api';

export class ApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem('class_heroes_token');
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem('class_heroes_token', token);
  } else {
    localStorage.removeItem('class_heroes_token');
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data: any = null;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg =
      (data && typeof data === 'object' && data.error) ||
      `خطأ في الخادم (${response.status})`;
    const errorCode = (data && typeof data === 'object' && data.code) || undefined;
    throw new ApiError(errorMsg, response.status, errorCode);
  }

  return data as T;
}
