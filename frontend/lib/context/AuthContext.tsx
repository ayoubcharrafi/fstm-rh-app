'use client';

import { createContext, useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, getToken, removeToken, setToken } from '@/lib/api';
import type { AuthUser } from '@/lib/types';

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Recharge le compte depuis l'API après modification (e-mail, profil, photo). */
  refreshUser: () => Promise<void>;
  isAdmin: () => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const qc = useQueryClient();

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
    // Le cache est indexé par clé, pas par utilisateur : sans purge, le compte
    // qui se connecte hériterait des données encore fraîches du précédent.
    qc.clear();
    setToken(res.data.access_token);
    setUser(res.data.user);
  }, [qc]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    removeToken();
    setUser(null);
    qc.clear();
  }, [qc]);

  const refreshUser = useCallback(async () => {
    if (!getToken()) return;
    const res = await api.get<AuthUser>('/auth/me');
    setUser(res.data);
  }, []);

  const isAdmin = useCallback(() => user?.role === 'ADMIN', [user]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
