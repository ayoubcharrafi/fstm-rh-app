'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface AuditLog {
  id: number;
  action: string;
  auditable_type: string | null;
  auditable_id: number | null;
  ip_address: string | null;
  created_at: string;
  user: { id: number; email: string } | null;
}

interface Paginated<T> { data: T[]; current_page: number; last_page: number; }

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<Paginated<AuditLog>>({
    queryKey: ['audit-logs', page],
    queryFn: () => api.get('/admin/audit-logs', { params: { page } }).then(r => r.data),
  });

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Journal d'audit</h1>
          <p className="text-sm text-gray-500">Toutes les actions sensibles de l'application</p>
        </div>

        <Card>
          <CardBody className="p-0">
            {isLoading ? (
              <p className="px-6 py-10 text-center text-sm text-gray-400">Chargement…</p>
            ) : !data?.data.length ? (
              <p className="px-6 py-10 text-center text-sm text-gray-400">Aucune entrée.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Utilisateur</th>
                    <th className="px-6 py-3">Action</th>
                    <th className="px-6 py-3">Entité</th>
                    <th className="px-6 py-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((log) => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-3 text-xs text-gray-400">
                        {new Date(log.created_at).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-6 py-3 text-gray-700">{log.user?.email ?? <span className="text-gray-400 italic">système</span>}</td>
                      <td className="px-6 py-3">
                        <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">{log.action}</span>
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-400">
                        {log.auditable_type ? `${log.auditable_type.split('\\').pop()} #${log.auditable_id}` : '—'}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-gray-400">{log.ip_address ?? '—'}</td>
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
