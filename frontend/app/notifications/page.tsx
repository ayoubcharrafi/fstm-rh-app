'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TYPE_META, typeMeta, relativeTime, fullDate, notificationHref } from '@/lib/notifications';
import type { Notification, PaginatedNotifications } from '@/lib/types';

type Filter = 'all' | 'unread' | 'read';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'unread', label: 'Non lues' },
  { value: 'read', label: 'Lues' },
];

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

// Regroupe par jour pour donner un repère temporel à la lecture.
function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "Aujourd'hui";
  if (sameDay(date, yesterday)) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function groupByDay(items: Notification[]): { label: string; items: Notification[] }[] {
  const groups: { label: string; items: Notification[] }[] = [];
  for (const item of items) {
    const label = dayLabel(item.created_at);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery<PaginatedNotifications>({
    queryKey: ['notifications', filter, type, page],
    queryFn: () =>
      api
        .get('/notifications', {
          params: { status: filter === 'all' ? undefined : filter, type: type || undefined, page },
        })
        .then(r => r.data),
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['notifications-bell'] });
    qc.invalidateQueries({ queryKey: ['notifications-count'] });
    qc.invalidateQueries({ queryKey: ['dashboard-user'] });
  };

  const [showPurge, setShowPurge] = useState(false);
  const [purgeDate, setPurgeDate] = useState('');

  const readAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      toast.success('Toutes les notifications sont marquées comme lues');
      invalidate();
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const purgeNotifications = useMutation<{ message: string }, unknown, { mode: 'read' | '7_days' | '30_days' | '90_days' | 'before_date'; before_date?: string }>({
    mutationFn: async (payload) => {
      const response = await api.post('/notifications/purge', payload);
      return response.data as { message: string };
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setShowPurge(false);
      setPurgeDate('');
      invalidate();
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const markRead = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read`),
    onSuccess: invalidate,
    onError: (err) => toast.error(getApiError(err)),
  });

  const items = data?.data ?? [];
  const unread = data?.unread_count ?? 0;
  const totalCount = data?.total_count ?? 0;
  const groups = groupByDay(items);

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">
              {unread > 0
                ? `${unread} non lue${unread > 1 ? 's' : ''} sur ${totalCount}`
                : `${totalCount} notification${totalCount > 1 ? 's' : ''} · tout est lu`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" loading={readAll.isPending} onClick={() => readAll.mutate()}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Tout marquer comme lu
            </Button>
            <Button variant="danger" size="sm" onClick={() => setShowPurge(true)} disabled={totalCount === 0 || purgeNotifications.isPending}>
              Purger
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardBody className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        ) : !items.length ? (
          <Card>
            <CardBody className="px-6 py-16 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                <svg className="h-6 w-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">
                {filter === 'unread'
                  ? 'Aucune notification non lue.'
                  : filter === 'read'
                    ? 'Aucune notification lue.'
                    : type
                      ? 'Aucune notification de ce type.'
                      : 'Aucune notification.'}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Vous serez averti ici à chaque évolution de vos demandes.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className={`space-y-5 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{group.label}</p>
                <Card>
                  <CardBody className="p-0">
                    <ul className="divide-y divide-gray-50">
                      {group.items.map((n) => {
                        const meta = typeMeta(n.type);
                        const href = notificationHref(n.data);
                        const isUnread = !n.read_at;

                        return (
                          <li
                            key={n.id}
                            className={`flex items-start gap-4 px-6 py-4 transition-colors ${isUnread ? 'bg-blue-50/40' : ''}`}
                          >
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}>
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d={meta.path} />
                              </svg>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                  {n.title}
                                </p>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.tone}`}>
                                  {meta.label}
                                </span>
                                {isUnread && <span className="h-2 w-2 rounded-full bg-blue-500" title="Non lu" />}
                              </div>
                              <p className="mt-0.5 text-sm text-gray-600">{n.message}</p>
                              <p className="mt-1 text-xs text-gray-400" title={fullDate(n.created_at)}>
                                {relativeTime(n.created_at)}
                              </p>
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs">
                              {href && (
                                <Link
                                  href={href}
                                  onClick={() => { if (isUnread) markRead.mutate(n.id); }}
                                  className="font-medium text-blue-600 hover:underline"
                                >
                                  Voir la demande →
                                </Link>
                              )}
                              {isUnread && (
                                <button
                                  onClick={() => markRead.mutate(n.id)}
                                  disabled={markRead.isPending}
                                  className="text-gray-500 hover:text-gray-700 hover:underline disabled:opacity-50"
                                >
                                  Marquer lu
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </CardBody>
                </Card>
              </div>
            ))}
          </div>
        )}

        {data && data.last_page > 1 && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-6 py-3">
            <p className="text-xs text-gray-400">
              Page {data.current_page} / {data.last_page} · {data.total} résultats
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Précédent
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)}>
                Suivant
              </Button>
            </div>
          </div>
        )}

        {showPurge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !purgeNotifications.isPending && setShowPurge(false)}>
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-start gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Purger les notifications</h2>
                  <p className="text-sm text-gray-500">Cette action supprime définitivement les notifications sélectionnées.</p>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-gray-200 p-3">
                  <label className="text-xs font-medium text-gray-600">Supprimer avant une date précise</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="date"
                      value={purgeDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setPurgeDate(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={!purgeDate || purgeNotifications.isPending}
                      onClick={() => {
                        if (purgeDate && confirm(`Supprimer toutes les notifications avant le ${purgeDate} ?`)) {
                          purgeNotifications.mutate({ mode: 'before_date', before_date: purgeDate });
                        }
                      }}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>

                <div className="relative py-1 text-center">
                  <span className="relative z-10 bg-white px-2 text-xs text-gray-400">ou par ancienneté</span>
                  <span className="absolute inset-x-0 top-1/2 h-px bg-gray-100" />
                </div>

                <button
                  type="button"
                  onClick={() => purgeNotifications.mutate({ mode: 'read' })}
                  disabled={purgeNotifications.isPending}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  <span>
                    <span className="font-medium text-gray-900">Notifications lues</span>
                    <br />
                    <span className="text-xs text-gray-500">Supprime toutes les notifications déjà lues</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => purgeNotifications.mutate({ mode: '7_days' })}
                  disabled={purgeNotifications.isPending}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  <span>
                    <span className="font-medium text-gray-900">Plus de 7 jours</span>
                    <br />
                    <span className="text-xs text-gray-500">Supprime les notifications anciennes de plus d’une semaine</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => purgeNotifications.mutate({ mode: '30_days' })}
                  disabled={purgeNotifications.isPending}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  <span>
                    <span className="font-medium text-gray-900">Plus de 30 jours</span>
                    <br />
                    <span className="text-xs text-gray-500">Supprime les notifications de plus d’un mois</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => purgeNotifications.mutate({ mode: '90_days' })}
                  disabled={purgeNotifications.isPending}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  <span>
                    <span className="font-medium text-gray-900">Plus de 90 jours</span>
                    <br />
                    <span className="text-xs text-gray-500">Supprime les notifications de plus de trois mois</span>
                  </span>
                </button>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowPurge(false)} disabled={purgeNotifications.isPending}>Annuler</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
