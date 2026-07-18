'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { OrganizationalUnit } from '@/lib/types';

export default function AdminOrgUnitsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<OrganizationalUnit | null>(null);
  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<Record<string, string>>({});

  const { data: units } = useQuery<OrganizationalUnit[]>({
    queryKey: ['org-units'],
    queryFn: () => api.get('/organizational-units').then(r => r.data),
  });

  // Flatten for parent select
  const flatUnits: OrganizationalUnit[] = [];
  units?.forEach(u => { flatUnits.push(u); u.children?.forEach(c => flatUnits.push(c)); });

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      editing
        ? api.patch(`/admin/organizational-units/${editing.id}`, data)
        : api.post('/admin/organizational-units', data),
    onSuccess: () => {
      toast.success(editing ? 'Unité mise à jour.' : 'Unité créée.');
      qc.invalidateQueries({ queryKey: ['org-units'] });
      reset(); setEditing(null);
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  const startEdit = (u: OrganizationalUnit) => {
    setEditing(u);
    setValue('nom_fr', u.nom_fr);
    setValue('nom_ar', u.nom_ar ?? '');
  };

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Départements & Services</h1>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Form */}
          <Card>
            <div className="border-b border-gray-100 px-6 py-4">
              <p className="font-semibold text-gray-900">{editing ? 'Modifier' : 'Nouvelle unité'}</p>
            </div>
            <CardBody>
              <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="flex flex-col gap-3" autoComplete="off">
                {!editing && <Input label="Code" placeholder="INF" {...register('code')} />}
                <Input label="Nom (FR)" {...register('nom_fr')} />
                <Input label="Nom (AR)" {...register('nom_ar')} />
                {!editing && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">Type</label>
                      <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" {...register('type')}>
                        <option value="DEPARTEMENT">Département</option>
                        <option value="SERVICE">Service</option>
                        <option value="LABORATOIRE">Laboratoire</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">Parent (optionnel)</label>
                      <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" {...register('parent_id')}>
                        <option value="">— Aucun —</option>
                        {flatUnits.map(u => <option key={u.id} value={u.id}>{u.nom_fr}</option>)}
                      </select>
                    </div>
                  </>
                )}
                <div className="flex gap-2 pt-1">
                  <Button type="submit" loading={isSubmitting} className="flex-1">{editing ? 'Modifier' : 'Créer'}</Button>
                  {editing && <Button type="button" variant="ghost" onClick={() => { setEditing(null); reset(); }}>Annuler</Button>}
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Tree */}
          <div className="lg:col-span-2">
            <Card>
              <CardBody className="p-0">
                {!units?.length ? (
                  <p className="px-6 py-8 text-center text-sm text-gray-400">Aucune unité.</p>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {units.map(u => (
                      <li key={u.id}>
                        <div className="flex items-center justify-between px-6 py-3">
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 mr-2">{u.type}</span>
                            <span className="font-medium text-gray-900">{u.nom_fr}</span>
                            {u.nom_ar && <span className="ml-2 text-sm text-gray-500" dir="rtl">{u.nom_ar}</span>}
                            <span className="ml-2 font-mono text-xs text-gray-300">{u.code}</span>
                          </div>
                          <button onClick={() => startEdit(u)} className="text-xs text-blue-600 hover:underline">Modifier</button>
                        </div>
                        {u.children?.map(c => (
                          <div key={c.id} className="flex items-center justify-between bg-gray-50 px-6 py-2 pl-12">
                            <div>
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-300 mr-2">{c.type}</span>
                              <span className="text-sm text-gray-700">{c.nom_fr}</span>
                            </div>
                            <button onClick={() => startEdit(c)} className="text-xs text-blue-600 hover:underline">Modifier</button>
                          </div>
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
