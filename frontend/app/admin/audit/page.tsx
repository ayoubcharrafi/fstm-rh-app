'use client';

import { useMemo, useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface AuditLog {
  id: number;
  action: string;
  auditable_type: string | null;
  auditable_id: number | null;
  ip_address: string | null;
  user_agent: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  user: { id: number; email: string } | null;
}

interface Paginated<T> { data: T[]; current_page: number; last_page: number; total: number; }

interface AuditResponse {
  logs: Paginated<AuditLog>;
  stats: { total: number; today: number; last_7d: number; top_action: string | null };
  actions: string[];
}

// Catégorise une action (auth.login, user.created, …) → couleur + libellé de groupe.
function actionCategory(action: string): { tone: string; group: string } {
  const prefix = action.split('.')[0];
  if (action.includes('deleted') || action.includes('purged') || action.includes('failed') || action.includes('reject'))
    return { tone: 'bg-red-50 text-red-700 ring-red-200', group: 'Sensible' };
  switch (prefix) {
    case 'auth':     return { tone: 'bg-green-50 text-green-700 ring-green-200', group: 'Authentification' };
    case 'user':     return { tone: 'bg-blue-50 text-blue-700 ring-blue-200', group: 'Utilisateurs' };
    case 'profile':  return { tone: 'bg-sky-50 text-sky-700 ring-sky-200', group: 'Profils' };
    case 'request':  return { tone: 'bg-amber-50 text-amber-700 ring-amber-200', group: 'Demandes' };
    case 'document': return { tone: 'bg-violet-50 text-violet-700 ring-violet-200', group: 'Documents' };
    default:         return { tone: 'bg-gray-100 text-gray-600 ring-gray-200', group: 'Autre' };
  }
}

const icon = (d: string, cls = 'h-5 w-5') => (
  <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  list: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  today: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  week: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.05 10.8c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
};

function StatCard({ label, value, iconPath, tone }: { label: string; value: string | number; iconPath: string; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>{icon(iconPath)}</span>
      <div className="min-w-0">
        <p className="truncate text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

const EMPTY_FILTERS = { search: '', action: '', from: '', to: '' };

// "il y a 3 h", "il y a 2 j" — indice relatif discret à côté de la date.
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d} j`;
  const mo = Math.floor(d / 30);
  return `il y a ${mo} mois`;
}

// Deux lignes date / heure pour un rendu plus aéré.
function splitDateTime(iso: string): { date: string; time: string } {
  const dt = new Date(iso);
  return {
    date: dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
}

// Couleur de la pastille catégorie (point à gauche du badge d'action).
function categoryDot(action: string): string {
  const prefix = action.split('.')[0];
  if (action.includes('deleted') || action.includes('purged') || action.includes('failed') || action.includes('reject')) return 'bg-red-500';
  return { auth: 'bg-green-500', user: 'bg-blue-500', profile: 'bg-sky-500', request: 'bg-amber-500', document: 'bg-violet-500' }[prefix] ?? 'bg-gray-400';
}

export default function AdminAuditPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPurge, setShowPurge] = useState(false);
  const [purgeDate, setPurgeDate] = useState('');

  const params = useMemo(
    () => ({ page, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')) }),
    [page, filters],
  );

  const { data, isLoading, isFetching } = useQuery<AuditResponse>({
    queryKey: ['audit-logs', params],
    queryFn: () => api.get('/admin/audit-logs', { params }).then(r => r.data),
  });

  const applyFilters = () => { setPage(1); setFilters(draft); };
  const resetFilters = () => { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); setPage(1); };
  const hasFilters = Object.values(filters).some(v => v !== '');

  const doExport = async (format: 'csv' | 'xlsx') => {
    setExporting(format);
    setShowExportMenu(false);
    try {
      const res = await api.get('/admin/audit-logs/export', {
        params: { ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')), format },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journal-audit-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Export ${format.toUpperCase()} téléchargé.`);
    } catch (e) {
      toast.error(getApiError(e));
    } finally {
      setExporting(null);
    }
  };

  const purgeMutation = useMutation({
    mutationFn: (body: { days?: number; before?: string; all?: boolean }) => api.delete('/admin/audit-logs', { data: body }),
    onSuccess: (res) => {
      toast.success((res.data as { message: string }).message);
      setShowPurge(false);
      setPurgeDate('');
      setPage(1);
      qc.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  const logs = data?.logs;

  return (
    <AppShell>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Journal d'audit</h1>
            <p className="text-sm text-gray-500">Traçabilité de toutes les actions sensibles de l'application</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Button
                variant="secondary" size="sm"
                loading={!!exporting}
                onClick={() => setShowExportMenu(v => !v)}
                disabled={!logs?.total}
              >
                {icon('M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', 'h-4 w-4')}
                Exporter
                {icon('M19 9l-7 7-7-7', 'h-3.5 w-3.5')}
              </Button>
              {showExportMenu && !exporting && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                    <button onClick={() => doExport('xlsx')} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-gray-50">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-50 text-emerald-600">{icon('M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', 'h-3.5 w-3.5')}</span>
                      <span><span className="font-medium text-gray-900">Excel</span><span className="block text-xs text-gray-400">.xlsx natif</span></span>
                    </button>
                    <button onClick={() => doExport('csv')} className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2.5 text-left text-sm hover:bg-gray-50">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-gray-600">{icon('M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', 'h-3.5 w-3.5')}</span>
                      <span><span className="font-medium text-gray-900">CSV</span><span className="block text-xs text-gray-400">séparé par virgules</span></span>
                    </button>
                  </div>
                </>
              )}
            </div>
            <Button variant="danger" size="sm" onClick={() => setShowPurge(true)} disabled={!data?.stats.total}>
              {icon('M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', 'h-4 w-4')}
              Purger
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Entrées totales" value={data?.stats.total ?? '—'} iconPath={ICONS.list} tone="bg-gray-100 text-gray-600" />
          <StatCard label="Aujourd'hui" value={data?.stats.today ?? '—'} iconPath={ICONS.today} tone="bg-blue-50 text-blue-600" />
          <StatCard label="7 derniers jours" value={data?.stats.last_7d ?? '—'} iconPath={ICONS.week} tone="bg-emerald-50 text-emerald-600" />
          <StatCard label="Action la plus fréquente" value={data?.stats.top_action ?? '—'} iconPath={ICONS.star} tone="bg-amber-50 text-amber-600" />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardBody className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-56 flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Recherche</label>
              <input
                value={draft.search}
                onChange={e => setDraft(d => ({ ...d, search: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                placeholder="Email, action, IP, entité…"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex min-w-44 flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Action</label>
              <select
                value={draft.action}
                onChange={e => setDraft(d => ({ ...d, action: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Toutes</option>
                {data?.actions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Du</label>
              <input type="date" value={draft.from} onChange={e => setDraft(d => ({ ...d, from: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Au</label>
              <input type="date" value={draft.to} onChange={e => setDraft(d => ({ ...d, to: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <Button size="md" onClick={applyFilters}>Filtrer</Button>
            {hasFilters && <Button variant="ghost" size="md" onClick={resetFilters}>Réinitialiser</Button>}
          </CardBody>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardBody className="p-0">
            {isLoading ? (
              <div className="flex flex-col gap-2 p-6">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />)}
              </div>
            ) : !logs?.data.length ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-300">
                  {icon('M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', 'h-6 w-6')}
                </span>
                <p className="text-sm text-gray-400">{hasFilters ? 'Aucune entrée ne correspond aux filtres.' : 'Aucune entrée.'}</p>
                {hasFilters && <button onClick={resetFilters} className="text-sm font-medium text-blue-600 hover:underline">Réinitialiser les filtres</button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      <th className="sticky top-0 z-[1] border-b border-gray-200 bg-gray-50/80 px-6 py-3 backdrop-blur">Horodatage</th>
                      <th className="sticky top-0 z-[1] border-b border-gray-200 bg-gray-50/80 px-6 py-3 backdrop-blur">Utilisateur</th>
                      <th className="sticky top-0 z-[1] border-b border-gray-200 bg-gray-50/80 px-6 py-3 backdrop-blur">Action</th>
                      <th className="sticky top-0 z-[1] border-b border-gray-200 bg-gray-50/80 px-6 py-3 backdrop-blur">Entité</th>
                      <th className="sticky top-0 z-[1] border-b border-gray-200 bg-gray-50/80 px-6 py-3 backdrop-blur">Adresse IP</th>
                      <th className="sticky top-0 z-[1] w-10 border-b border-gray-200 bg-gray-50/80 px-6 py-3 backdrop-blur" />
                    </tr>
                  </thead>
                  <tbody>
                    {logs.data.map((log, i) => {
                      const cat = actionCategory(log.action);
                      const hasDetail = !!(log.old_values || log.new_values || log.user_agent);
                      const isOpen = expanded === log.id;
                      const dt = splitDateTime(log.created_at);
                      const initial = (log.user?.email?.[0] ?? '·').toUpperCase();
                      return (
                        <Fragment key={log.id}>
                          <tr
                            onClick={() => hasDetail && setExpanded(isOpen ? null : log.id)}
                            className={`transition-colors ${isOpen ? 'bg-blue-50/40' : i % 2 ? 'bg-gray-50/40' : 'bg-white'} ${hasDetail ? 'cursor-pointer hover:bg-blue-50/60' : ''}`}
                          >
                            <td className="border-b border-gray-100 px-6 py-3 whitespace-nowrap">
                              <div className="font-medium text-gray-700">{dt.date}</div>
                              <div className="text-xs text-gray-400">{dt.time} · {relativeTime(log.created_at)}</div>
                            </td>
                            <td className="border-b border-gray-100 px-6 py-3">
                              {log.user ? (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">{initial}</span>
                                  <span className="text-gray-700">{log.user.email}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                    {icon('M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', 'h-3.5 w-3.5')}
                                  </span>
                                  <span className="italic text-gray-400">système</span>
                                </div>
                              )}
                            </td>
                            <td className="border-b border-gray-100 px-6 py-3">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-medium ring-1 ring-inset ${cat.tone}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${categoryDot(log.action)}`} />
                                {log.action}
                              </span>
                            </td>
                            <td className="border-b border-gray-100 px-6 py-3 text-xs text-gray-500">
                              {log.auditable_type
                                ? <span className="rounded bg-gray-100 px-2 py-0.5 font-mono">{log.auditable_type.split('\\').pop()} #{log.auditable_id}</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="border-b border-gray-100 px-6 py-3 font-mono text-xs text-gray-400">{log.ip_address ?? '—'}</td>
                            <td className="border-b border-gray-100 px-6 py-3 text-gray-300">
                              {hasDetail && (
                                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors ${isOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}>
                                  {icon(isOpen ? 'M19 15l-7-7-7 7' : 'M19 9l-7 7-7-7', 'h-4 w-4')}
                                </span>
                              )}
                            </td>
                          </tr>
                          {isOpen && hasDetail && (
                            <tr className="bg-blue-50/30">
                              <td colSpan={6} className="border-b border-gray-100 px-6 pb-4 pt-0">
                                <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-2">
                                  {log.old_values && (
                                    <div>
                                      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500"><span className="h-2 w-2 rounded-full bg-red-400" />Avant</p>
                                      <pre className="max-h-48 overflow-auto rounded-lg bg-gray-900 p-3 text-xs leading-relaxed text-gray-100">{JSON.stringify(log.old_values, null, 2)}</pre>
                                    </div>
                                  )}
                                  {log.new_values && (
                                    <div>
                                      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500"><span className="h-2 w-2 rounded-full bg-green-400" />Après</p>
                                      <pre className="max-h-48 overflow-auto rounded-lg bg-gray-900 p-3 text-xs leading-relaxed text-gray-100">{JSON.stringify(log.new_values, null, 2)}</pre>
                                    </div>
                                  )}
                                  {log.user_agent && (
                                    <div className="md:col-span-2">
                                      <p className="mb-1 text-xs font-semibold text-gray-500">User-Agent</p>
                                      <p className="break-all font-mono text-xs text-gray-500">{log.user_agent}</p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {logs && logs.last_page > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-3">
                <p className="text-xs text-gray-500">
                  Page <span className="font-semibold text-gray-700">{logs.current_page}</span> / {logs.last_page} · {logs.total} entrée{logs.total > 1 ? 's' : ''}
                  {isFetching && ' · …'}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
                  <Button variant="secondary" size="sm" disabled={page >= logs.last_page} onClick={() => setPage(p => p + 1)}>Suivant</Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Purge modal */}
      {showPurge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !purgeMutation.isPending && setShowPurge(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-start gap-3">
              <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                {icon('M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z')}
              </span>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Purger le journal</h2>
                <p className="text-sm text-gray-500">Cette action est irréversible. Choisissez la portée.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {/* Purge par date précise */}
              <div className="rounded-lg border border-gray-200 p-3">
                <label className="text-xs font-medium text-gray-600">Supprimer avant une date précise</label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="date"
                    value={purgeDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={e => setPurgeDate(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Button
                    variant="danger" size="sm"
                    disabled={!purgeDate || purgeMutation.isPending}
                    onClick={() => { if (confirm(`Supprimer toutes les entrées avant le ${purgeDate} ?`)) purgeMutation.mutate({ before: purgeDate }); }}
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
                onClick={() => purgeMutation.mutate({ days: 90 })}
                disabled={purgeMutation.isPending}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                <span><span className="font-medium text-gray-900">Plus de 90 jours</span><br /><span className="text-xs text-gray-500">Conserve les 3 derniers mois</span></span>
                {icon('M9 5l7 7-7 7', 'h-4 w-4 text-gray-400')}
              </button>
              <button
                onClick={() => purgeMutation.mutate({ days: 30 })}
                disabled={purgeMutation.isPending}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                <span><span className="font-medium text-gray-900">Plus de 30 jours</span><br /><span className="text-xs text-gray-500">Conserve le dernier mois</span></span>
                {icon('M9 5l7 7-7 7', 'h-4 w-4 text-gray-400')}
              </button>
              <button
                onClick={() => { if (confirm('Vider TOUT le journal d\'audit ? Cette action est définitive.')) purgeMutation.mutate({ all: true }); }}
                disabled={purgeMutation.isPending}
                className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <span><span className="font-medium">Tout vider</span><br /><span className="text-xs text-red-500">Supprime la totalité des entrées</span></span>
                {icon('M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', 'h-4 w-4')}
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowPurge(false)} disabled={purgeMutation.isPending}>Annuler</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
