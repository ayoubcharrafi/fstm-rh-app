'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import { typeMeta, relativeTime, fullDate } from '@/lib/notifications';
import type { Paginated, Notification as AppNotification } from '@/lib/types';

/**
 * Cloche de notifications avec panneau déroulant.
 * Réutilise la query ['notifications'] partagée avec la sidebar (cache commun).
 */
export function NotificationBell() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery<Paginated<AppNotification>>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 30_000,
  });

  const items = data?.data ?? [];
  const unread = items.filter(n => !n.read_at).length;

  const markOne = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  // Fermeture au clic extérieur / touche Échap.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const allHref = isAdmin() ? '/admin/notifications' : '/notifications';
  const preview = items.slice(0, 6);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 origin-top-right overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg sm:w-96">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">
              Notifications{unread > 0 && <span className="ml-1 text-gray-400">· {unread} non lue{unread > 1 ? 's' : ''}</span>}
            </p>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {preview.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">Aucune notification.</p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
              {preview.map(n => {
                const meta = typeMeta(n.type);
                return (
                  <li
                    key={n.id}
                    onClick={() => { if (!n.read_at) markOne.mutate(n.id); }}
                    className={`flex gap-3 px-4 py-3 transition-colors ${n.read_at ? '' : 'cursor-pointer bg-blue-50/40 hover:bg-blue-50/70'}`}
                  >
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${meta.tone}`}>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={meta.path} />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${n.read_at ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>{n.title}</p>
                      <p className="truncate text-xs text-gray-500">{n.message}</p>
                      <p className="mt-0.5 text-xs text-gray-400" title={fullDate(n.created_at)}>{relativeTime(n.created_at)}</p>
                    </div>
                    {!n.read_at && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" title="Non lu" />}
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href={allHref}
            onClick={() => setOpen(false)}
            className="block border-t border-gray-100 px-4 py-2.5 text-center text-sm font-medium text-blue-600 transition-colors hover:bg-gray-50"
          >
            Voir toutes les notifications
          </Link>
        </div>
      )}
    </div>
  );
}
