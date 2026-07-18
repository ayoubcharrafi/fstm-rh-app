'use client';

import { createContext, useCallback, useEffect, useState } from 'react';
import { api, getToken, removeToken, setToken } from '@/lib/api';
import type { AuthUser } from '@/lib/types';

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setIsLoading(false); return; }
    api.get<AuthUser>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => removeToken())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ access_token: string; user: AuthUser }>('/auth/login', { email, password });
    setToken(res.data.access_token);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    removeToken();
    setUser(null);
  }, []);

  const isAdmin = useCallback(() => user?.role === 'ADMIN', [user]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
