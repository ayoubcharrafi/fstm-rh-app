'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import type { AdminDashboard } from '@/lib/types';

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-gray-600">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon', EN_ATTENTE: 'En attente', EN_COURS: 'En cours',
  VALIDEE: 'Validée', REJETEE: 'Rejetée', DOCUMENT_DISPONIBLE: 'Disponible', ANNULEE: 'Annulée',
};

const STATUS_COLORS: Record<string, string> = {
  EN_ATTENTE: 'bg-yellow-400', EN_COURS: 'bg-blue-400', VALIDEE: 'bg-green-400',
  REJETEE: 'bg-red-400', DOCUMENT_DISPONIBLE: 'bg-emerald-400', BROUILLON: 'bg-gray-300', ANNULEE: 'bg-gray-200',
};

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery<AdminDashboard>({
    queryKey: ['dashboard-admin'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data),
  });

  const totalRequests = data ? Object.values(data.requests_by_status).reduce((a, b) => a + (b ?? 0), 0) : 0;

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord — Administration</h1>
          <p className="text-sm text-gray-500">Vue globale de l'activité RH</p>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400">Chargement…</p>
        ) : (
          <>
            {/* Top stats */}
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Total utilisateurs" value={(data?.users_by_role?.PROFESSEUR ?? 0) + (data?.users_by_role?.EMPLOYE ?? 0)} />
              <StatCard label="Professeurs" value={data?.users_by_role?.PROFESSEUR ?? 0} />
              <StatCard label="Employés" value={data?.users_by_role?.EMPLOYE ?? 0} />
              <StatCard label="Comptes actifs" value={data?.active_users ?? 0} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Requests by status */}
              <Card>
                <div className="border-b border-gray-100 px-6 py-4">
                  <p className="font-semibold text-gray-900">Demandes par statut</p>
                  <p className="text-sm text-gray-400">Total : {totalRequests}</p>
                </div>
                <CardBody className="flex flex-col gap-3">
                  {Object.entries(data?.requests_by_status ?? {}).map(([status, count]) => {
                    const pct = totalRequests ? Math.round(((count ?? 0) / totalRequests) * 100) : 0;
                    return (
                      <div key={status}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="text-gray-700">{STATUS_LABELS[status] ?? status}</span>
                          <span className="font-medium text-gray-900">{count}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100">
                          <div
                            className={`h-2 rounded-full transition-all ${STATUS_COLORS[status] ?? 'bg-gray-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardBody>
              </Card>

              {/* Monthly activity */}
              <Card>
                <div className="border-b border-gray-100 px-6 py-4">
                  <p className="font-semibold text-gray-900">Activité mensuelle</p>
                  <p className="text-sm text-gray-400">Demandes {new Date().getFullYear()}</p>
                </div>
                <CardBody>
                  {!data?.monthly_requests.length ? (
                    <p className="py-4 text-center text-sm text-gray-400">Aucune donnée.</p>
                  ) : (
                    <div className="flex items-end gap-2 h-32">
                      {data.monthly_requests.map((m) => {
                        const max = Math.max(...data.monthly_requests.map(x => x.total), 1);
                        const pct = (m.total / max) * 100;
                        return (
                          <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                            <span className="text-xs font-medium text-gray-700">{m.total}</span>
                            <div className="w-full rounded-t bg-blue-500" style={{ height: `${pct}%`, minHeight: '4px' }} />
                            <span className="text-xs text-gray-400">{m.month.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="mt-4 text-sm text-gray-500">
                    Temps moyen de traitement : <strong>{data?.avg_processing_hours}h</strong>
                  </p>
                </CardBody>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
