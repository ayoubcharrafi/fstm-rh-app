'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { NotificationBell } from '@/components/ui/NotificationBell';
import type { UserDashboard, DocumentRequest, DocumentType, Paginated } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon', EN_ATTENTE: 'En attente', EN_COURS: 'En cours',
  VALIDEE: 'Validée', REJETEE: 'Rejetée', DOCUMENT_DISPONIBLE: 'Disponible', ANNULEE: 'Annulée',
};

// Recharts a besoin de couleurs réelles, pas de classes Tailwind — alignées sur StatusBadge.
const STATUS_HEX: Record<string, string> = {
  BROUILLON: '#9ca3af', EN_ATTENTE: '#facc15', EN_COURS: '#3b82f6', VALIDEE: '#22c55e',
  REJETEE: '#ef4444', DOCUMENT_DISPONIBLE: '#10b981', ANNULEE: '#d1d5db',
};

const ICONS = {
  doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  x: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  draft: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  timer: 'M12 8v4l2 2m6-2a8 8 0 11-16 0 8 8 0 0116 0z',
  plus: 'M12 4v16m8-8H4',
};

function formatHours(hours: number): string {
  if (!hours || hours <= 0) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${Math.round(hours * 10) / 10} h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return rem ? `${days} j ${rem} h` : `${days} j`;
}

const iconEl = (d: string, cls = 'h-5 w-5') => (
  <svg className={`${cls} flex-shrink-0`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

function KpiCard({
  label, value, sub, tone, iconPath, href,
}: {
  label: string; value: string | number; sub?: string;
  tone: 'blue' | 'amber' | 'red' | 'emerald' | 'indigo' | 'gray';
  iconPath: string; href?: string;
}) {
  const toneMap: Record<string, { bar: string; chip: string }> = {
    blue:    { bar: 'bg-blue-500',    chip: 'bg-blue-50 text-blue-600' },
    amber:   { bar: 'bg-yellow-400',  chip: 'bg-yellow-50 text-yellow-600' },
    red:     { bar: 'bg-red-500',     chip: 'bg-red-50 text-red-600' },
    emerald: { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-600' },
    indigo:  { bar: 'bg-indigo-500',  chip: 'bg-indigo-50 text-indigo-600' },
    gray:    { bar: 'bg-gray-400',    chip: 'bg-gray-100 text-gray-600' },
  };
  const t = toneMap[tone];
  const card = (
    <div className="relative h-full overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span className={`absolute inset-x-0 top-0 h-1 ${t.bar}`} />
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${t.chip}`}>
        {iconEl(iconPath)}
      </span>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-600">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{card}</Link> : card;
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 rounded-xl bg-gray-100" />)}
      </div>
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-72 rounded-xl bg-gray-100 lg:col-span-2" />
        <div className="h-72 rounded-xl bg-gray-100" />
      </div>
      <div className="h-64 rounded-xl bg-gray-100" />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading, isFetching, refetch } = useQuery<UserDashboard>({
    queryKey: ['dashboard-user'],
    queryFn: () => api.get('/dashboard/user').then(r => r.data),
  });

  const { data: recentRequests } = useQuery<Paginated<DocumentRequest>>({
    queryKey: ['requests-recent'],
    queryFn: () => api.get('/requests?per_page=5').then(r => r.data),
  });

  // Types autorisés pour son rôle — sert les raccourcis « demander ce document ».
  const { data: docTypes } = useQuery<DocumentType[]>({
    queryKey: ['document-types'],
    queryFn: () => api.get('/document-types').then(r => r.data),
  });

  const handleRefresh = async () => {
    await refetch();
    toast.success('Données actualisées');
  };

  const profile = user?.staff_profile;
  const fullName = profile?.prenom_fr ? `${profile.prenom_fr} ${profile.nom_fr}` : user?.email;

  const monthLabel = (m: string) => {
    const [, mm] = m.split('-');
    return ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'][Number(mm) - 1] ?? m;
  };

  const monthly = (stats?.monthly_requests ?? []).map(m => ({ ...m, label: monthLabel(m.month) }));

  const statusPie = stats
    ? Object.entries(stats.by_status)
        .filter(([, v]) => (v ?? 0) > 0)
        .map(([status, total]) => ({ name: STATUS_LABELS[status] ?? status, status, total: total ?? 0 }))
    : [];

  const kpis = stats?.kpis;
  const byType = stats?.requests_by_type ?? [];
  const maxType = Math.max(...byType.map(t => t.total), 1);
  const quickTypes = (docTypes ?? []).slice(0, 7);

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="sticky top-12 z-20 -mx-4 -mt-4 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200/70 bg-gray-50/80 px-4 py-4 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 lg:top-0 lg:-mx-8 lg:-mt-8 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bonjour, {fullName}</h1>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isFetching ? 'Actualisation…' : 'Actualiser'}
            </button>
            <Link href="/requests/new">
              <Button>
                {iconEl(ICONS.plus, 'h-4 w-4')}
                Nouvelle demande
              </Button>
            </Link>
          </div>
        </div>

        {isLoading || !stats || !kpis ? (
          <Skeleton />
        ) : (
          <div className="animate-fade-in-up">
            {/* Rappel brouillons */}
            {kpis.drafts > 0 && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
                <span className="text-amber-500">{iconEl(ICONS.draft)}</span>
                <p className="flex-1 text-sm text-amber-800">
                  Vous avez <strong>{kpis.drafts}</strong> brouillon{kpis.drafts > 1 ? 's' : ''} non soumis.
                  Une demande en brouillon n&apos;est pas traitée par l&apos;administration.
                </p>
                <Link href="/requests?status=BROUILLON" className="text-sm font-medium text-amber-700 hover:underline">
                  Finaliser →
                </Link>
              </div>
            )}

            {/* KPI band */}
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard label="Total demandes" value={kpis.total_requests} tone="gray" iconPath={ICONS.doc}
                sub="depuis la création du compte" href="/requests" />
              <KpiCard label="En cours de traitement" value={kpis.in_flight} tone="amber" iconPath={ICONS.clock}
                sub={`${kpis.pending} en attente · ${kpis.in_progress} examinées`} href="/requests?status=EN_TRAITEMENT" />
              <KpiCard label="Documents disponibles" value={kpis.available} tone="emerald" iconPath={ICONS.check}
                sub="prêts à télécharger" href="/documents" />
              <KpiCard label="Rejetées" value={kpis.rejected} tone="red" iconPath={ICONS.x}
                sub="consulter le motif" href="/requests?status=REJETEE" />
              <KpiCard label="Brouillons" value={kpis.drafts} tone="indigo" iconPath={ICONS.draft}
                sub="à compléter" href="/requests?status=BROUILLON" />
              <KpiCard label="Délai moyen" value={formatHours(kpis.avg_completion_hours)} tone="blue" iconPath={ICONS.timer}
                sub="soumission → document" />
            </div>

            {/* Graphiques */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <p className="font-semibold text-gray-900">Mon activité</p>
                  <p className="text-sm text-gray-400">6 derniers mois — demandes créées et documents obtenus</p>
                </CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={monthly} margin={{ left: -16, right: 8, top: 8, bottom: 4 }}>
                      <defs>
                        <linearGradient id="gUserTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="total" name="Créées" stroke="#3b82f6" strokeWidth={2} fill="url(#gUserTotal)" />
                      <Area type="monotone" dataKey="completed" name="Documents obtenus" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <p className="font-semibold text-gray-900">Répartition par statut</p>
                  <p className="text-sm text-gray-400">Total : {kpis.total_requests}</p>
                </CardHeader>
                <CardBody>
                  {!statusPie.length ? (
                    <p className="py-8 text-center text-sm text-gray-400">Aucune demande pour le moment.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={statusPie} dataKey="total" nameKey="name" cx="50%" cy="50%"
                          innerRadius={50} outerRadius={85} paddingAngle={2}>
                          {statusPie.map(s => <Cell key={s.status} fill={STATUS_HEX[s.status] ?? '#9ca3af'} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Dernières demandes + types les plus demandés */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900">Dernières demandes</p>
                  <Link href="/requests" className="text-sm font-medium text-blue-600 hover:underline">Tout voir →</Link>
                </CardHeader>
                <CardBody className="p-0">
                  {!recentRequests?.data?.length ? (
                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                      <span className="text-gray-300">{iconEl(ICONS.doc, 'h-8 w-8')}</span>
                      <p className="text-sm text-gray-400">Aucune demande pour le moment.</p>
                      <Link href="/requests/new">
                        <Button size="sm">Créer ma première demande</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                          <th className="px-6 py-3">Référence</th>
                          <th className="px-6 py-3">Type</th>
                          <th className="px-6 py-3">Statut</th>
                          <th className="px-6 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentRequests.data.map((req) => (
                          <tr key={req.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-6 py-3">
                              <Link href={`/requests/${req.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                                {req.reference}
                              </Link>
                            </td>
                            <td className="px-6 py-3 text-gray-700">{req.document_type?.nom_fr ?? '—'}</td>
                            <td className="px-6 py-3"><StatusBadge status={req.status} /></td>
                            <td className="px-6 py-3 text-gray-400">
                              {new Date(req.created_at).toLocaleDateString('fr-FR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader><p className="font-semibold text-gray-900">Mes documents les plus demandés</p></CardHeader>
                <CardBody>
                  {!byType.length ? (
                    <p className="py-8 text-center text-sm text-gray-400">Aucune donnée.</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {byType.map((t) => (
                        <li key={t.label}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm text-gray-700" title={t.label}>{t.label}</span>
                            <span className="text-sm font-semibold text-gray-900">{t.total}</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                            <div className="h-1.5 rounded-full bg-blue-400" style={{ width: `${(t.total / maxType) * 100}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Raccourcis : demander un document */}
            {quickTypes.length > 0 && (
              <Card>
                <CardHeader>
                  <p className="font-semibold text-gray-900">Demander un document</p>
                  <p className="text-sm text-gray-400">Types disponibles pour votre profil</p>
                </CardHeader>
                <CardBody>
                  <div className="-mx-4 flex overflow-x-auto gap-3 px-4 py-2">
                    {quickTypes.map((t) => (
                      <Link
                        key={t.id}
                        href={`/requests/new?type=${t.id}`}
                        className="min-w-[180px] flex-shrink-0 rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
                      >
                        <span className="text-gray-400">{iconEl(ICONS.doc)}</span>
                        <span className="mt-2 block text-xs font-medium text-gray-700">{t.nom_fr}</span>
                      </Link>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
