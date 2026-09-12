import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Makes an authenticated request to the backend API.
 * Automatically injects the Supabase auth token.
 */
async function authFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
}

/**
 * Start a token risk analysis. Returns an EventSource for SSE streaming.
 */
export function startAnalysis(tokenAddress: string): {
  eventSource: EventSource | null;
  promise: Promise<Response>;
} {
  // We use a POST request that returns an SSE stream.
  // Since EventSource only supports GET, we use fetch for the POST
  // and manually parse the SSE stream.
  const promise = authFetch('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ token_address: tokenAddress }),
  });

  return { eventSource: null, promise };
}

/**
 * Fetch the user's analysis history.
 */
export async function fetchHistory(
  limit: number = 20,
  offset: number = 0,
): Promise<Response> {
  return authFetch(`/api/history?limit=${limit}&offset=${offset}`);
}

/**
 * Fetch a specific analysis by ID.
 */
export async function fetchAnalysis(analysisId: string): Promise<Response> {
  return authFetch(`/api/history/${analysisId}`);
}

/**
 * Delete a specific history item.
 */
export async function deleteHistoryItem(analysisId: string): Promise<Response> {
  return authFetch(`/api/history/${analysisId}`, { method: 'DELETE' });
}

/**
 * Clear all history for the current user.
 */
export async function clearAllHistory(): Promise<Response> {
  return authFetch(`/api/history`, { method: 'DELETE' });
}

/**
 * Delete the user's account and all associated data.
 */
export async function deleteAccount(): Promise<Response> {
  return authFetch(`/api/auth/account`, { method: 'DELETE' });
}

/**
 * Wallet authentication: get a nonce for signing.
 */
export async function getWalletNonce(): Promise<{ nonce: string }> {
  const res = await fetch(`${API_BASE}/api/auth/wallet/nonce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
}

/**
 * Wallet authentication: verify signature and get Supabase token.
 */
export async function verifyWalletSignature(
  publicKey: string,
  signature: string,
  nonce: string,
): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(`${API_BASE}/api/auth/wallet/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_key: publicKey, signature, nonce }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Wallet verification failed');
  }
  return res.json();
}
