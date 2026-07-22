'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import { api } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { NotificationBell } from '@/components/ui/NotificationBell';
import type { AdminDashboard, RequestStatus } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon', EN_ATTENTE: 'En attente', EN_COURS: 'En cours',
  VALIDEE: 'Validée', REJETEE: 'Rejetée', DOCUMENT_DISPONIBLE: 'Disponible', ANNULEE: 'Annulée',
};

// Hex palette (Recharts needs real colors, not Tailwind classes) — aligned with StatusBadge.
const STATUS_HEX: Record<string, string> = {
  BROUILLON: '#9ca3af', EN_ATTENTE: '#facc15', EN_COURS: '#3b82f6', VALIDEE: '#22c55e',
  REJETEE: '#ef4444', DOCUMENT_DISPONIBLE: '#10b981', ANNULEE: '#d1d5db',
};

// ---------- helpers ----------
function formatBytes(bytes: number): string {
  if (!bytes) return '0 o';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatHours(hours: number): string {
  if (!hours || hours <= 0) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${Math.round(hours * 10) / 10} h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return rem ? `${days} j ${rem} h` : `${days} j`;
}

function formatAge(hours: number): string {
  if (hours < 1) return "< 1 h";
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j`;
}

function trend(current: number, previous: number): { pct: number; up: boolean } | null {
  if (previous === 0) return current > 0 ? { pct: 100, up: true } : null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return null;
  return { pct: Math.abs(pct), up: pct > 0 };
}

const iconEl = (d: string, cls = 'h-5 w-5') => (
  <svg className={`${cls} flex-shrink-0`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  x: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  userPlus: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
  storage: 'M4 7v10c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3V7M4 7c0-2 1.5-3 4-3h8c2.5 0 4 1 4 3M4 7c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3',
  timer: 'M12 8v4l2 2m6-2a8 8 0 11-16 0 8 8 0 0116 0z',
};

// KPI card with an icon chip (clair & coloré)
function KpiCard({
  label, value, sub, tone, iconPath, trendData,
}: {
  label: string; value: string | number; sub?: string;
  tone: 'blue' | 'amber' | 'red' | 'green' | 'emerald' | 'indigo' | 'sky' | 'gray';
  iconPath: string;
  trendData?: { pct: number; up: boolean } | null;
}) {
  const toneMap: Record<string, { bar: string; chip: string }> = {
    blue:    { bar: 'bg-blue-500',    chip: 'bg-blue-50 text-blue-600' },
    amber:   { bar: 'bg-yellow-400',  chip: 'bg-yellow-50 text-yellow-600' },
    red:     { bar: 'bg-red-500',     chip: 'bg-red-50 text-red-600' },
    green:   { bar: 'bg-green-500',   chip: 'bg-green-50 text-green-600' },
    emerald: { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-600' },
    indigo:  { bar: 'bg-indigo-500',  chip: 'bg-indigo-50 text-indigo-600' },
    sky:     { bar: 'bg-sky-500',     chip: 'bg-sky-50 text-sky-600' },
    gray:    { bar: 'bg-gray-400',    chip: 'bg-gray-100 text-gray-600' },
  };
  const t = toneMap[tone];
  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span className={`absolute inset-x-0 top-0 h-1 ${t.bar}`} />
      <div className="flex items-start justify-between">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${t.chip}`}>
          {iconEl(iconPath, 'h-5 w-5')}
        </span>
        {trendData && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold
            ${trendData.up ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={trendData.up ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
            </svg>
            {trendData.pct}%
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-600">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function HBars({ data, color }: { data: { label: string; total: number }[]; color: string }) {
  if (!data.length) return <p className="py-8 text-center text-sm text-gray-400">Aucune donnée.</p>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
        <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11, fill: '#4b5563' }} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
        <Bar dataKey="total" fill={color} radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function RankList({ data, empty }: { data: { name: string; total: number }[]; empty: string }) {
  if (!data.length) return <p className="py-8 text-center text-sm text-gray-400">{empty}</p>;
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <ul className="flex flex-col gap-3">
      {data.map((d, i) => (
        <li key={`${d.name}-${i}`} className="flex items-center gap-3">
          <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold
            ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm text-gray-700">{d.name}</span>
              <span className="text-sm font-semibold text-gray-900">{d.total}</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
              <div className="h-1.5 rounded-full bg-blue-400" style={{ width: `${(d.total / max) * 100}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

const QUICK_LINKS = [
  { href: '/admin/requests', label: 'Demandes', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { href: '/admin/users', label: 'Utilisateurs', d: ICONS.users },
  { href: '/admin/documents', label: 'Types de documents', d: ICONS.doc },
  { href: '/admin/organizational-units', label: 'Départements', d: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { href: '/admin/grades', label: 'Grades', d: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { href: '/admin/audit', label: "Journal d'audit", d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
];

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-32 rounded-xl bg-gray-100" />)}
      </div>
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-80 rounded-xl bg-gray-100 lg:col-span-2" />
        <div className="h-80 rounded-xl bg-gray-100" />
      </div>
    </div>
  );
}

// ---------- page ----------
export default function AdminDashboardPage() {
  const { data, isLoading, isFetching, refetch } = useQuery<AdminDashboard>({
    queryKey: ['dashboard-admin'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data),
  });

  const handleRefresh = async () => {
    await refetch();
    toast.success('Données actualisées');
  };

  const monthLabel = (m: string) => {
    const [, mm] = m.split('-');
    return ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'][Number(mm) - 1] ?? m;
  };

  const statusPie = data
    ? Object.entries(data.requests_by_status)
        .filter(([, v]) => (v ?? 0) > 0)
        .map(([status, total]) => ({ name: STATUS_LABELS[status] ?? status, status, total: total ?? 0 }))
    : [];

  const monthly = (data?.monthly_requests ?? []).map(m => ({ ...m, label: monthLabel(m.month) }));

  const pipelineSteps = data ? [
    { key: 'Soumission → Traitement', h: data.pipeline.submit_to_processing },
    { key: 'Traitement → Décision', h: data.pipeline.processing_to_decision },
    { key: 'Décision → Disponible', h: data.pipeline.decision_to_available },
  ] : [];
  const pipelineMax = Math.max(...pipelineSteps.map(s => s.h), 1);

  const files = data?.files_stats;
  const totalFiles = files ? files.attachments + files.generated + files.signed : 0;

  return (
    <AppShell>
      <div className="p-8">
        {/* Header */}
        <div className="sticky top-0 z-20 -mx-8 -mt-8 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200/70 bg-gray-50/80 px-8 py-4 backdrop-blur">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="text-sm text-gray-500">Vue globale de l'activité RH</p>
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
          </div>
        </div>

        {isLoading || !data ? (
          <Skeleton />
        ) : (
          <div className="animate-fade-in-up">
            {/* Alerte demandes bloquées */}
            {data.stale_count > 0 && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
                <svg className="h-5 w-5 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="flex-1 text-sm text-amber-800">
                  <strong>{data.stale_count}</strong> demande{data.stale_count > 1 ? 's' : ''} en attente depuis plus de 48 h.
                </p>
                <Link href="/admin/requests" className="text-sm font-medium text-amber-700 hover:underline">Traiter →</Link>
              </div>
            )}

            {/* KPI band — 8 cartes */}
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCard label="Total demandes" value={data.kpis.total_requests} tone="blue" iconPath={ICONS.doc}
                sub={`${data.kpis.requests_last_30d} sur 30 jours`}
                trendData={trend(data.kpis.requests_last_30d, data.kpis.requests_prev_30d)} />
              <KpiCard label="À traiter" value={data.kpis.backlog} tone="amber" iconPath={ICONS.clock}
                sub={`${data.kpis.pending} en attente · ${data.kpis.in_progress} en cours`} />
              <KpiCard label="Taux de rejet" value={`${data.kpis.rejection_rate}%`} tone="red" iconPath={ICONS.x}
                sub={`${data.kpis.rejected} rejetées`} />
              <KpiCard label="Documents disponibles" value={data.kpis.available} tone="emerald" iconPath={ICONS.check}
                sub={`${data.kpis.validated} validées`} />
              <KpiCard label="Comptes actifs" value={data.kpis.active_users} tone="green" iconPath={ICONS.users}
                sub={`${data.kpis.inactive_users} inactifs · ${data.kpis.total_users} total`} />
              <KpiCard label="Nouveaux utilisateurs" value={data.kpis.new_users_30d} tone="sky" iconPath={ICONS.userPlus}
                sub="30 derniers jours" />
              <KpiCard label="Stockage fichiers" value={formatBytes(files?.total_size ?? 0)} tone="gray" iconPath={ICONS.storage}
                sub={`${totalFiles} fichiers`} />
              <KpiCard label="Temps moyen" value={formatHours(data.avg_processing_hours)} tone="indigo" iconPath={ICONS.timer}
                sub="soumission → validation" />
            </div>

            {/* Graphiques principaux */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <p className="font-semibold text-gray-900">Activité mensuelle</p>
                  <p className="text-sm text-gray-400">12 derniers mois — créées, validées, rejetées</p>
                </CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={monthly} margin={{ left: -16, right: 8, top: 8, bottom: 4 }}>
                      <defs>
                        <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="total" name="Total" stroke="#3b82f6" strokeWidth={2} fill="url(#gTotal)" />
                      <Area type="monotone" dataKey="validated" name="Validées" stroke="#22c55e" strokeWidth={2} fillOpacity={0} />
                      <Area type="monotone" dataKey="rejected" name="Rejetées" stroke="#ef4444" strokeWidth={2} fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <p className="font-semibold text-gray-900">Demandes par statut</p>
                  <p className="text-sm text-gray-400">Total : {data.kpis.total_requests}</p>
                </CardHeader>
                <CardBody>
                  {!statusPie.length ? (
                    <p className="py-8 text-center text-sm text-gray-400">Aucune donnée.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={statusPie} dataKey="total" nameKey="name" cx="50%" cy="50%"
                          innerRadius={55} outerRadius={90} paddingAngle={2}>
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

            {/* Répartitions */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><p className="font-semibold text-gray-900">Demandes par type de document</p></CardHeader>
                <CardBody><HBars data={data.requests_by_type} color="#6366f1" /></CardBody>
              </Card>
              <Card>
                <CardHeader><p className="font-semibold text-gray-900">Demandes par département</p></CardHeader>
                <CardBody><HBars data={data.requests_by_department} color="#0ea5e9" /></CardBody>
              </Card>
            </div>

            {/* Cycle de vie + fichiers */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <p className="font-semibold text-gray-900">Cycle de vie des demandes</p>
                  <p className="text-sm text-gray-400">Durée moyenne par étape</p>
                </CardHeader>
                <CardBody className="flex flex-col gap-4">
                  {pipelineSteps.map((s, i) => (
                    <div key={s.key}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-gray-700">{s.key}</span>
                        <span className="font-semibold text-gray-900">{formatHours(s.h)}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100">
                        <div className={`h-2 rounded-full ${['bg-blue-400', 'bg-indigo-400', 'bg-emerald-400'][i]}`}
                          style={{ width: `${(s.h / pipelineMax) * 100}%`, minWidth: s.h > 0 ? '6px' : '0' }} />
                      </div>
                    </div>
                  ))}
                </CardBody>
              </Card>

              <Card>
                <CardHeader><p className="font-semibold text-gray-900">Documents</p></CardHeader>
                <CardBody className="flex flex-col gap-3">
                  {[
                    { label: 'Pièces jointes', value: files?.attachments ?? 0, cls: 'bg-gray-100 text-gray-700' },
                    { label: 'Générés', value: files?.generated ?? 0, cls: 'bg-blue-100 text-blue-700' },
                    { label: 'Signés', value: files?.signed ?? 0, cls: 'bg-emerald-100 text-emerald-700' },
                  ].map(f => (
                    <div key={f.label} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{f.label}</span>
                      <span className={`inline-flex min-w-8 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${f.cls}`}>{f.value}</span>
                    </div>
                  ))}
                  <div className="mt-1 border-t border-gray-100 pt-3 text-sm">
                    <span className="text-gray-600">Stockage total : </span>
                    <span className="font-semibold text-gray-900">{formatBytes(files?.total_size ?? 0)}</span>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* File des demandes à traiter */}
            <div className="mb-6">
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">Demandes à traiter</p>
                    <p className="text-sm text-gray-400">Les plus anciennes en priorité</p>
                  </div>
                  <Link href="/admin/requests" className="text-sm font-medium text-blue-600 hover:underline">Tout voir →</Link>
                </CardHeader>
                <CardBody className="p-0">
                  {!data.pending_queue.length ? (
                    <p className="py-8 text-center text-sm text-gray-400">Aucune demande en attente. 🎉</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                        <tr>
                          <th className="px-6 py-3">Référence</th>
                          <th className="px-6 py-3">Demandeur</th>
                          <th className="px-6 py-3">Type</th>
                          <th className="px-6 py-3">Statut</th>
                          <th className="px-6 py-3">Ancienneté</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.pending_queue.map(r => (
                          <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-6 py-3">
                              <Link href="/admin/requests" className="font-mono text-xs text-blue-600 hover:underline">{r.reference}</Link>
                            </td>
                            <td className="px-6 py-3 text-gray-700">{r.requester}</td>
                            <td className="px-6 py-3 text-gray-500">{r.document_type}</td>
                            <td className="px-6 py-3"><StatusBadge status={r.status} /></td>
                            <td className="px-6 py-3">
                              <span className={`text-xs font-medium ${r.age_hours >= 48 ? 'text-red-600' : 'text-gray-500'}`}>
                                {formatAge(r.age_hours)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Classements + activité */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader><p className="font-semibold text-gray-900">Top demandeurs</p></CardHeader>
                <CardBody><RankList data={data.top_requesters} empty="Aucune demande." /></CardBody>
              </Card>
              <Card>
                <CardHeader><p className="font-semibold text-gray-900">Top agents traitants</p></CardHeader>
                <CardBody><RankList data={data.top_processors} empty="Aucun traitement." /></CardBody>
              </Card>
              <Card>
                <CardHeader><p className="font-semibold text-gray-900">Activité récente</p></CardHeader>
                <CardBody className="p-0">
                  {!data.recent_activity.length ? (
                    <p className="py-8 text-center text-sm text-gray-400">Aucune activité.</p>
                  ) : (
                    <ul className="max-h-80 divide-y divide-gray-50 overflow-y-auto">
                      {data.recent_activity.map(a => (
                        <li key={a.id} className="px-6 py-3 text-sm">
                          <div className="mb-1 flex items-center gap-2">
                            {a.old_status && <StatusBadge status={a.old_status as RequestStatus} />}
                            <svg className="h-3 w-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                            <StatusBadge status={a.new_status as RequestStatus} />
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <Link href="/admin/requests" className="font-mono text-blue-600 hover:underline">{a.reference}</Link>
                            <span>{a.by}</span>
                          </div>
                          {a.at && <p className="text-xs text-gray-400">{new Date(a.at).toLocaleString('fr-FR')}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Accès rapides */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {QUICK_LINKS.map(l => (
                <Link key={l.href} href={l.href}
                  className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md">
                  <span className="text-gray-400">{iconEl(l.d)}</span>
                  <span className="text-xs font-medium text-gray-700">{l.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
