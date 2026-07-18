'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import type { UserDashboard, DocumentRequest, Paginated } from '@/lib/types';

function StatCard({ label, value, color = 'blue' }: { label: string; value: number; color?: string }) {
  const colors: Record<string, string> = {
    blue:    'bg-blue-50 text-blue-700',
    green:   'bg-green-50 text-green-700',
    yellow:  'bg-yellow-50 text-yellow-700',
    gray:    'bg-gray-100 text-gray-600',
  };
  return (
    <div className={`rounded-xl p-5 ${colors[color]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-medium">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats } = useQuery<UserDashboard>({
    queryKey: ['dashboard-user'],
    queryFn: () => api.get('/dashboard/user').then(r => r.data),
  });

  const { data: recentRequests } = useQuery<Paginated<DocumentRequest>>({
    queryKey: ['requests-recent'],
    queryFn: () => api.get('/requests?per_page=5').then(r => r.data),
  });

  const profile = user?.staff_profile;
  const fullName = profile ? `${profile.prenom_fr} ${profile.nom_fr}` : user?.email;

  return (
    <AppShell>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bonjour, {fullName}</h1>
            <p className="text-sm text-gray-500">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <Link href="/requests/new">
            <Button>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle demande
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total demandes" value={stats?.total_requests ?? 0} color="gray" />
          <StatCard label="En attente" value={stats?.by_status?.EN_ATTENTE ?? 0} color="yellow" />
          <StatCard label="En cours" value={stats?.by_status?.EN_COURS ?? 0} color="blue" />
          <StatCard label="Documents disponibles" value={stats?.documents_available ?? 0} color="green" />
        </div>

        {/* Recent requests */}
        <Card>
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Dernières demandes</h2>
            <Link href="/requests" className="text-sm text-blue-600 hover:underline">Voir tout</Link>
          </div>
          <CardBody className="p-0">
            {!recentRequests?.data?.length ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">Aucune demande pour le moment.</p>
            ) : (
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
                        <Link href={`/requests/${req.id}`} className="font-mono text-blue-600 hover:underline">
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
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
