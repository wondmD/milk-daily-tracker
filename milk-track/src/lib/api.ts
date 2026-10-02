import { getSession, signOut } from 'next-auth/react';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function messageFromPayload(payload: unknown, fallback: string) {
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.detail === 'string' && record.detail.trim()) {
    return record.detail;
  }

  const parts = Object.values(record).flatMap((value) => {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') return [value];
    return [];
  });
  return parts.length > 0 ? parts.join(' ') : fallback;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  // Try to get the session from NextAuth
  // Note: This works in client components. For server components, we might need to pass the token explicitly.
  let token = null;
  try {
    const session = await getSession();
    if (session && (session as any).accessToken) {
      token = (session as any).accessToken;
    }
  } catch (e) {
    console.error("Error getting session:", e);
  }

  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    console.warn("API returned 401 Unauthorized for", endpoint);
    if (typeof window !== 'undefined') {
      signOut({ redirect: true, callbackUrl: '/login' });
    }
  }

  if (!response.ok) {
    const text = await response.text();
    let payload: unknown = text;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }
    throw new ApiError(
      messageFromPayload(payload, `API error: ${response.statusText || response.status}`),
      response.status,
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
