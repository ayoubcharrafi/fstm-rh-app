'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { typeMeta, relativeTime, fullDate } from '@/lib/notifications';
import type { Paginated, Notification as AppNotification, User } from '@/lib/types';

// ─── Types locaux (réponses admin) ──────────────────────────────────────────
interface NotifStats {
  total: number;
  unread: number;
  read: number;
  read_rate: number;
  by_type: { type: string; total: number }[];
  audience: { all: number; ADMIN: number; PROFESSEUR: number; EMPLOYE: number };
}

type TabKey = 'diffuser' | 'inbox' | 'stats';
type Audience = 'all' | 'role' | 'user';
type TargetRole = 'ADMIN' | 'PROFESSEUR' | 'EMPLOYE';
type InboxFilter = 'all' | 'unread' | 'read';

// ─── Helpers UI ──────────────────────────────────────────────────────────────
const icon = (d: string, cls = 'h-5 w-5') => (
  <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  megaphone: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  inbox: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  bellRing: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  check: 'M5 13l4 4L19 7',
  tag: 'M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z',
  percent: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2z',
};

// Métadonnées par type de notification (label + icône + couleurs).
// TYPE_META / typeMeta / relativeTime / fullDate sont partagés avec la cloche du dashboard.

const TABS: { key: TabKey; label: string; path: string }[] = [
  { key: 'diffuser', label: 'Diffuser',         path: ICONS.megaphone },
  { key: 'inbox',    label: 'Mes notifications', path: ICONS.inbox },
  { key: 'stats',    label: 'Statistiques',     path: ICONS.chart },
];

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AdminNotificationsPage() {
  const [tab, setTab] = useState<TabKey>('diffuser');

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">
            Diffusez des annonces, consultez votre boîte de réception et suivez l&apos;activité.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-1 border-b border-gray-200">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors
                ${tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {icon(t.path, 'h-4 w-4')}
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'diffuser' && <BroadcastTab />}
        {tab === 'inbox'    && <InboxTab />}
        {tab === 'stats'    && <StatsTab />}
      </div>
    </AppShell>
  );
}

// ─── Onglet 1 · Diffuser ─────────────────────────────────────────────────────
const ROLE_OPTIONS: { value: TargetRole; label: string }[] = [
  { value: 'PROFESSEUR', label: 'Professeurs' },
  { value: 'EMPLOYE',    label: 'Employés' },
  { value: 'ADMIN',      label: 'Administrateurs' },
];

function BroadcastTab() {
  const qc = useQueryClient();
  const [audience, setAudience] = useState<Audience>('all');
  const [role, setRole] = useState<TargetRole>('PROFESSEUR');
  const [userId, setUserId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const { data: stats } = useQuery<NotifStats>({
    queryKey: ['admin-notif-stats'],
    queryFn: () => api.get('/admin/notifications/stats').then(r => r.data),
  });

  const { data: users } = useQuery<Paginated<User>>({
    queryKey: ['users-min'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
    enabled: audience === 'user',
  });

  const userLabel = (u: User) =>
    u.staff_profile ? `${u.staff_profile.prenom_fr} ${u.staff_profile.nom_fr} · ${u.email}` : u.email;

  const recipientCount = useMemo(() => {
    if (!stats) return null;
    if (audience === 'all') return stats.audience.all;
    if (audience === 'role') return stats.audience[role];
    return userId ? 1 : 0;
  }, [stats, audience, role, userId]);

  const send = useMutation({
    mutationFn: () =>
      api.post('/admin/notifications/broadcast', {
        audience,
        role: audience === 'role' ? role : undefined,
        user_id: audience === 'user' ? userId : undefined,
        title,
        message,
      }).then(r => r.data),
    onSuccess: (data: { message: string; recipients: number }) => {
      if (data.recipients > 0) toast.success(data.message);
      else toast.info(data.message);
      setTitle(''); setMessage('');
      qc.invalidateQueries({ queryKey: ['admin-notif-stats'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    },
    onError: e => toast.error(getApiError(e)),
  });

  const canSend = title.trim() !== '' && message.trim() !== '' && !(audience === 'user' && !userId);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Formulaire */}
      <div className="lg:col-span-3">
        <Card>
          <div className="border-b border-gray-100 px-6 py-4">
            <p className="font-semibold text-gray-900">Nouvelle annonce</p>
            <p className="mt-0.5 text-sm text-gray-500">Envoyée immédiatement en tant que notification interne.</p>
          </div>
          <CardBody className="space-y-5">
            {/* Cible */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-800">Destinataires</label>
              <div className="flex flex-wrap gap-2">
                {([
                  { v: 'all',  l: 'Tout le monde' },
                  { v: 'role', l: 'Par rôle' },
                  { v: 'user', l: 'Un utilisateur' },
                ] as { v: Audience; l: string }[]).map(o => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setAudience(o.v)}
                    className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors
                      ${audience === o.v
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            {audience === 'role' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-800">Rôle ciblé</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as TargetRole)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            {audience === 'user' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-800">Utilisateur</label>
                <select
                  value={userId}
                  onChange={e => setUserId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">— Sélectionner —</option>
                  {users?.data.map(u => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}
                </select>
              </div>
            )}

            <Input
              label="Titre"
              placeholder="Ex. Maintenance planifiée"
              maxLength={120}
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Message</label>
              <textarea
                rows={4}
                maxLength={1000}
                placeholder="Rédigez votre annonce…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-right text-xs text-gray-400">{message.length}/1000</p>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500">
                {recipientCount === null
                  ? '…'
                  : <>Envoyée à <span className="font-semibold text-gray-800">{recipientCount}</span> personne(s).</>}
              </p>
              <Button onClick={() => send.mutate()} loading={send.isPending} disabled={!canSend}>
                Envoyer l&apos;annonce
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Aperçu live */}
      <div className="lg:col-span-2">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Aperçu</p>
        <Card>
          <CardBody>
            <div className="flex gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                {icon(ICONS.megaphone)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">Annonce</span>
                  <span className="text-xs text-gray-400">à l&apos;instant</span>
                </div>
                <p className="mt-1.5 font-semibold text-gray-900">{title || 'Titre de l’annonce'}</p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-600">
                  {message || 'Le contenu de votre message apparaîtra ici.'}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
        <p className="mt-3 text-xs text-gray-400">
          Les annonces sont envoyées comme notifications internes. Les destinataires les verront dans leur cloche de notifications.
        </p>
      </div>
    </div>
  );
}

// ─── Onglet 2 · Mes notifications ────────────────────────────────────────────
function InboxTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<InboxFilter>('all');

  const { data, isLoading } = useQuery<Paginated<AppNotification>>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
  });

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    },
    onError: e => toast.error(getApiError(e)),
  });

  const markOne = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    },
    onError: e => toast.error(getApiError(e)),
  });

  const items = data?.data ?? [];
  const unread = items.filter(n => !n.read_at).length;
  const filtered = items.filter(n =>
    filter === 'all' ? true : filter === 'unread' ? !n.read_at : !!n.read_at,
  );

  const FILTERS: { v: InboxFilter; l: string }[] = [
    { v: 'all',    l: 'Toutes' },
    { v: 'unread', l: 'Non lues' },
    { v: 'read',   l: 'Lues' },
  ];

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
          {FILTERS.map(f => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                ${filter === f.v ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {f.l}{f.v === 'unread' && unread > 0 ? ` (${unread})` : ''}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={() => markAll.mutate()} loading={markAll.isPending} disabled={unread === 0}>
          Tout marquer comme lu
        </Button>
      </div>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                {icon(ICONS.inbox, 'h-6 w-6')}
              </div>
              <p className="text-sm text-gray-400">
                {filter === 'all' ? 'Aucune notification.' : 'Aucune notification dans ce filtre.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map(n => {
                const meta = typeMeta(n.type);
                return (
                  <li
                    key={n.id}
                    className={`flex gap-3 px-5 py-4 transition-colors ${n.read_at ? '' : 'bg-blue-50/40'} ${n.read_at ? '' : 'cursor-pointer hover:bg-blue-50/70'}`}
                    onClick={() => { if (!n.read_at) markOne.mutate(n.id); }}
                  >
                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${meta.tone}`}>
                      {icon(meta.path, 'h-5 w-5')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-400">{meta.label}</span>
                        {!n.read_at && (
                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" title="Non lu" />
                        )}
                      </div>
                      <p className={`mt-0.5 text-sm ${n.read_at ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>{n.title}</p>
                      <p className="mt-0.5 break-words text-sm text-gray-500">{n.message}</p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-400" title={fullDate(n.created_at)}>
                      {relativeTime(n.created_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ─── Onglet 3 · Statistiques ─────────────────────────────────────────────────
function StatsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<NotifStats>({
    queryKey: ['admin-notif-stats'],
    queryFn: () => api.get('/admin/notifications/stats').then(r => r.data),
  });

  const purge = useMutation({
    mutationFn: () => api.delete('/admin/settings/read-notifications'),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? 'Notifications purgées.');
      qc.invalidateQueries({ queryKey: ['admin-notif-stats'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    },
    onError: e => toast.error(getApiError(e)),
  });

  const confirmPurge = () => {
    if (!data || data.read === 0) {
      toast.info('Aucune notification lue à supprimer.');
      return;
    }
    if (window.confirm(`Supprimer définitivement ${data.read} notification(s) lue(s) ?`)) {
      purge.mutate();
    }
  };

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
        ))}
      </div>
    );
  }

  const maxType = Math.max(1, ...data.by_type.map(t => t.total));
  const AUDIENCE_ROWS: { key: keyof NotifStats['audience']; label: string }[] = [
    { key: 'all',        label: 'Tout le monde' },
    { key: 'ADMIN',      label: 'Administrateurs' },
    { key: 'PROFESSEUR', label: 'Professeurs' },
    { key: 'EMPLOYE',    label: 'Employés' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total" value={data.total} path={ICONS.bellRing} tone="bg-blue-50 text-blue-600" />
        <StatCard label="Non lues" value={data.unread} path={ICONS.inbox} tone="bg-amber-50 text-amber-600" />
        <StatCard label="Taux de lecture" value={`${data.read_rate} %`} path={ICONS.percent} tone="bg-green-50 text-green-600" />
        <StatCard label="Types distincts" value={data.by_type.length} path={ICONS.tag} tone="bg-purple-50 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Répartition par type */}
        <Card>
          <div className="border-b border-gray-100 px-6 py-4">
            <p className="font-semibold text-gray-900">Répartition par type</p>
          </div>
          <CardBody>
            {data.by_type.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Aucune notification.</p>
            ) : (
              <ul className="space-y-3">
                {data.by_type.map(t => {
                  const meta = typeMeta(t.type);
                  return (
                    <li key={t.type}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-700">
                          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                        <span className="font-semibold text-gray-900">{t.total}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div className={`h-full rounded-full ${meta.dot}`} style={{ width: `${(t.total / maxType) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Audience */}
        <Card>
          <div className="border-b border-gray-100 px-6 py-4">
            <p className="font-semibold text-gray-900">Audience active</p>
            <p className="mt-0.5 text-sm text-gray-500">Comptes actifs pouvant recevoir une diffusion.</p>
          </div>
          <CardBody>
            <ul className="divide-y divide-gray-100">
              {AUDIENCE_ROWS.map(r => (
                <li key={r.key} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 text-sm text-gray-700">
                    {icon(ICONS.users, 'h-4 w-4 text-gray-400')}
                    {r.label}
                  </span>
                  <span className="font-semibold text-gray-900">{data.audience[r.key]}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* Maintenance */}
      <Card>
        <div className="border-b border-gray-100 px-6 py-4">
          <p className="font-semibold text-gray-900">Maintenance</p>
          <p className="mt-0.5 text-sm text-gray-500">Nettoyage des notifications lues sur toute la plateforme.</p>
        </div>
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Purger les notifications lues</p>
              <p className="text-xs text-gray-500">
                {data.read} lue(s) · {data.unread} non lue(s). Seules les notifications déjà lues sont supprimées.
              </p>
            </div>
            <Button variant="danger" onClick={confirmPurge} loading={purge.isPending}>
              Purger les notifications lues
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function StatCard({ label, value, path, tone }: { label: string; value: string | number; path: string; tone: string }) {
  return (
    <Card>
      <CardBody className="flex items-center gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${tone}`}>
          {icon(path)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-2xl font-bold text-gray-900">{value}</p>
          <p className="truncate text-xs text-gray-500">{label}</p>
        </div>
      </CardBody>
    </Card>
  );
}
