'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RoleBadge } from '@/components/ui/Badge';
import type { Paginated, User } from '@/lib/types';

export default function AdminUsersPage() {
  const [search, setSearch]   = useState('');
  const [roleFilter, setRole] = useState<'PROFESSEUR' | 'EMPLOYE' | ''>('');
  const [page, setPage]       = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Paginated<User>>({
    queryKey: ['admin-users', search, roleFilter, page],
    queryFn: () => api.get('/admin/users', {
      params: {
        search: search || undefined,
        role:   roleFilter || undefined,
        page,
      },
    }).then(r => r.data),
  });

  // Filter out admins client-side as extra safety
  const users = data?.data.filter(u => u.role !== 'ADMIN') ?? [];

  const toggleStatus = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.patch(`/admin/users/${id}/status`, { is_active }),
    onSuccess: () => { toast.success('Statut mis à jour.'); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: (e) => toast.error(getApiError(e)),
  });

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Professeurs & Employés</h1>
            <p className="text-sm text-gray-500">Gestion du personnel de la FST</p>
          </div>
          <Link href="/admin/users/new"><Button>+ Nouveau</Button></Link>
        </div>

        {/* Filters */}
        <div className="mb-4 flex items-center gap-3">
          <input
            type="search"
            placeholder="Rechercher par nom ou email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {(['', 'PROFESSEUR', 'EMPLOYE'] as const).map(r => (
            <button
              key={r}
              onClick={() => { setRole(r); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors
                ${roleFilter === r ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {r === '' ? 'Tous' : r === 'PROFESSEUR' ? 'Professeurs' : 'Employés'}
            </button>
          ))}
        </div>

        <Card>
          <CardBody className="p-0">
            {isLoading ? (
              <p className="px-6 py-10 text-center text-sm text-gray-400">Chargement…</p>
            ) : !users.length ? (
              <p className="px-6 py-10 text-center text-sm text-gray-400">Aucun utilisateur trouvé.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    <th className="px-6 py-3">Nom complet</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Rôle</th>
                    <th className="px-6 py-3">Département</th>
                    <th className="px-6 py-3">Statut</th>
                    <th className="px-6 py-3">Dernière connexion</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-3">
                        {u.staff_profile ? (
                          <div>
                            <p className="font-medium text-gray-900">{u.staff_profile.prenom_fr} {u.staff_profile.nom_fr}</p>
                            {u.staff_profile.nom_ar && (
                              <p className="text-xs text-gray-400" dir="rtl">{u.staff_profile.prenom_ar} {u.staff_profile.nom_ar}</p>
                            )}
                          </div>
                        ) : (
                          <span className="italic text-gray-400">Sans profil</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-600">{u.email}</td>
                      <td className="px-6 py-3"><RoleBadge role={u.role} /></td>
                      <td className="px-6 py-3 text-gray-600 text-xs">
                        {u.staff_profile?.organizational_unit?.nom_fr ?? '—'}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => toggleStatus.mutate({ id: u.id, is_active: !u.is_active })}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors
                            ${u.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                        >
                          {u.is_active ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-400">
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-6 py-3">
                        <Link href={`/admin/users/${u.id}`} className="text-xs text-blue-600 hover:underline">
                          Fiche
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
