import axios, { AxiosError } from 'axios';
import Cookies from 'js-cookie';

const TOKEN_KEY = 'fst_token';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  withCredentials: false,
});

// ─── Request interceptor — attach token ───────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = Cookies.get(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor — handle 401 ───────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      Cookies.remove(TOKEN_KEY);
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ─── Token helpers ────────────────────────────────────────────────────────────
export function setToken(token: string) {
  Cookies.set(TOKEN_KEY, token, { expires: 1, sameSite: 'lax' });
}

export function removeToken() {
  Cookies.remove(TOKEN_KEY);
}

export function getToken() {
  return Cookies.get(TOKEN_KEY);
}

// ─── Error helper ─────────────────────────────────────────────────────────────
export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;
    if (data?.message) return data.message as string;
    if (data?.errors) {
      const first = Object.values(data.errors as Record<string, string[]>)[0];
      return Array.isArray(first) ? first[0] : String(first);
    }
    return error.message;
  }
  return 'Une erreur est survenue.';
}

// ─── Health (server-side compatible) ─────────────────────────────────────────
export function getServerApiUrl() {
  return process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
}

export async function getApiHealth(): Promise<{ status: string } | null> {
  try {
    const res = await fetch(`${getServerApiUrl()}/health`, { cache: 'no-store' });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}
