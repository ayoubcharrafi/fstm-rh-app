'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import type { DocumentRequest, Paginated, RequestStatus } from '@/lib/types';

const STATUSES: { value: RequestStatus | ''; label: string }[] = [
  { value: '', label: 'Toutes' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'VALIDEE', label: 'Validées' },
  { value: 'REJETEE', label: 'Rejetées' },
  { value: 'DOCUMENT_DISPONIBLE', label: 'Disponibles' },
];

export default function AdminRequestsPage() {
  const [status, setStatus] = useState<RequestStatus | ''>('EN_ATTENTE');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<Paginated<DocumentRequest>>({
    queryKey: ['admin-requests', status, page],
    queryFn: () => api.get('/requests', { params: { status: status || undefined, page } }).then(r => r.data),
  });

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Toutes les demandes</h1>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => { setStatus(s.value); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors
                ${status === s.value ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <Card>
          <CardBody className="p-0">
            {isLoading ? (
              <p className="px-6 py-10 text-center text-sm text-gray-400">Chargement…</p>
            ) : !data?.data.length ? (
              <p className="px-6 py-10 text-center text-sm text-gray-400">Aucune demande.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    <th className="px-6 py-3">Référence</th>
                    <th className="px-6 py-3">Demandeur</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Statut</th>
                    <th className="px-6 py-3">Soumis le</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((req) => (
                    <tr key={req.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-3 font-mono text-blue-600">{req.reference}</td>
                      <td className="px-6 py-3 text-gray-700">
                        {req.requester?.staff_profile
                          ? `${req.requester.staff_profile.prenom_fr} ${req.requester.staff_profile.nom_fr}`
                          : req.requester?.email}
                      </td>
                      <td className="px-6 py-3 text-gray-700">{req.document_type?.nom_fr ?? '—'}</td>
                      <td className="px-6 py-3"><StatusBadge status={req.status} /></td>
                      <td className="px-6 py-3 text-gray-400">
                        {req.submitted_at ? new Date(req.submitted_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-6 py-3">
                        <Link href={`/admin/requests/${req.id}`} className="text-blue-600 hover:underline text-xs">
                          Traiter
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {data && data.last_page > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                <p className="text-xs text-gray-400">Page {data.current_page} / {data.last_page}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
                  <Button variant="secondary" size="sm" disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)}>Suivant</Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
