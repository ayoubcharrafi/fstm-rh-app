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
import type { Grade } from '@/lib/types';

export default function AdminGradesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Grade | null>(null);
  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<Partial<Grade> & { staff_type?: string }>({});

  const { data: grades } = useQuery<Grade[]>({
    queryKey: ['grades'],
    queryFn: () => api.get('/grades').then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Grade> & { staff_type?: string }) =>
      editing
        ? api.patch(`/admin/grades/${editing.id}`, data)
        : api.post('/admin/grades', data),
    onSuccess: () => {
      toast.success(editing ? 'Grade mis à jour.' : 'Grade créé.');
      qc.invalidateQueries({ queryKey: ['grades'] });
      reset(); setEditing(null);
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  const toggleMutation = useMutation({
    mutationFn: (g: Grade) => api.patch(`/admin/grades/${g.id}`, { is_active: !g.is_active }),
    onSuccess: () => { toast.success('Statut mis à jour.'); qc.invalidateQueries({ queryKey: ['grades'] }); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const startEdit = (g: Grade) => {
    setEditing(g);
    setValue('code', g.code);
    setValue('intitule_fr', g.intitule_fr);
    setValue('intitule_ar', g.intitule_ar ?? '');
    setValue('staff_type', g.staff_type ?? undefined);
  };

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Grades</h1>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Form */}
          <Card>
            <div className="border-b border-gray-100 px-6 py-4">
              <p className="font-semibold text-gray-900">{editing ? 'Modifier le grade' : 'Nouveau grade'}</p>
            </div>
            <CardBody>
              <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="flex flex-col gap-3" autoComplete="off">
                <Input label="Code" placeholder="PES-C" {...register('code')} disabled={!!editing} />
                <Input label="Intitulé (FR)" {...register('intitule_fr')} />
                <Input label="Intitulé (AR)" {...register('intitule_ar')} />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Type de personnel</label>
                  <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" {...register('staff_type')}>
                    <option value="">Les deux</option>
                    <option value="PROFESSEUR">Professeur</option>
                    <option value="EMPLOYE">Employé</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="submit" loading={isSubmitting} className="flex-1">
                    {editing ? 'Modifier' : 'Créer'}
                  </Button>
                  {editing && (
                    <Button type="button" variant="ghost" onClick={() => { setEditing(null); reset(); }}>
                      Annuler
                    </Button>
                  )}
                </div>
              </form>
            </CardBody>
          </Card>

          {/* List */}
          <div className="lg:col-span-2">
            <Card>
              <CardBody className="p-0">
                {!grades?.length ? (
                  <p className="px-6 py-8 text-center text-sm text-gray-400">Aucun grade.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                        <th className="px-6 py-3">Code</th>
                        <th className="px-6 py-3">Intitulé</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Statut</th>
                        <th className="px-6 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {grades.map(g => (
                        <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-6 py-3 font-mono text-xs text-gray-500">{g.code}</td>
                          <td className="px-6 py-3 text-gray-700">{g.intitule_fr}</td>
                          <td className="px-6 py-3 text-xs text-gray-400">{g.staff_type ?? 'Tous'}</td>
                          <td className="px-6 py-3">
                            <button
                              onClick={() => toggleMutation.mutate(g)}
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${g.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                            >
                              {g.is_active ? 'Actif' : 'Inactif'}
                            </button>
                          </td>
                          <td className="px-6 py-3">
                            <button onClick={() => startEdit(g)} className="text-xs text-blue-600 hover:underline">
                              Modifier
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
