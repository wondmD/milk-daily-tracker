import { getSession, signOut } from 'next-auth/react';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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
    throw new Error(`API error: ${response.statusText}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
