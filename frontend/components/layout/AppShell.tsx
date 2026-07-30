'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [menuOuvert, setMenuOuvert] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!menuOuvert) return;
    const surEchap = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOuvert(false); };
    window.addEventListener('keydown', surEchap);
    return () => window.removeEventListener('keydown', surEchap);
  }, [menuOuvert]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <svg className="h-8 w-8 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sous `lg`, la sidebar est un tiroir superposé : l'overlay l'assombrit et
          le referme au toucher. */}
      {menuOuvert && (
        <div
          onClick={() => setMenuOuvert(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
        />
      )}

      <Sidebar mobileOpen={menuOuvert} onNavigate={() => setMenuOuvert(false)} />

      <main className="flex-1 overflow-y-auto scrollbar-stable">
        <button
          onClick={() => setMenuOuvert(true)}
          aria-label="Ouvrir le menu"
          className="sticky top-0 z-30 flex h-12 w-full items-center gap-2 border-b border-gray-200 bg-white/90 px-4 text-sm font-medium text-gray-700 backdrop-blur lg:hidden"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Menu
        </button>
        {children}
      </main>
    </div>
  );
}
