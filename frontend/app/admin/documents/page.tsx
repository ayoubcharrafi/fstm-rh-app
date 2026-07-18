'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { DocumentType } from '@/lib/types';

const schema = z.object({
  code:              z.string().min(1, 'Requis'),
  nom_fr:            z.string().min(1, 'Requis'),
  nom_ar:            z.string().optional(),
  allowed_role:      z.enum(['TOUS', 'PROFESSEUR', 'EMPLOYE']),
  requires_language: z.boolean(),
});
type FormData = z.infer<typeof schema>;

const ROLE_LABELS: Record<string, string> = {
  TOUS:       'Professeurs & Employés',
  PROFESSEUR: 'Professeurs uniquement',
  EMPLOYE:    'Employés uniquement',
};

const ROLE_COLORS: Record<string, string> = {
  TOUS:       'bg-blue-100 text-blue-700',
  PROFESSEUR: 'bg-purple-100 text-purple-700',
  EMPLOYE:    'bg-orange-100 text-orange-700',
};

export default function AdminDocumentsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<DocumentType | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { allowed_role: 'TOUS', requires_language: false },
  });

  const { data: docTypes, isLoading } = useQuery<DocumentType[]>({
    queryKey: ['document-types'],
    queryFn: () => api.get('/document-types').then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      editing
        ? api.patch(`/admin/document-types/${editing.id}`, data)
        : api.post('/admin/document-types', data),
    onSuccess: () => {
      toast.success(editing ? 'Document modifié.' : 'Document ajouté.');
      qc.invalidateQueries({ queryKey: ['document-types'] });
      reset(); setEditing(null); setShowForm(false);
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  const toggleMutation = useMutation({
    mutationFn: (d: DocumentType) =>
      api.patch(`/admin/document-types/${d.id}`, { is_active: !d.is_active }),
    onSuccess: () => { toast.success('Statut mis à jour.'); qc.invalidateQueries({ queryKey: ['document-types'] }); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/document-types/${id}`),
    onSuccess: () => { toast.success('Document supprimé.'); qc.invalidateQueries({ queryKey: ['document-types'] }); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const startEdit = (d: DocumentType) => {
    setEditing(d);
    setValue('code', d.code);
    setValue('nom_fr', d.nom_fr);
    setValue('nom_ar', d.nom_ar ?? '');
    setValue('allowed_role', d.allowed_role);
    setValue('requires_language', d.requires_language);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancel = () => { setEditing(null); reset(); setShowForm(false); };

  // Group by category
  const tous       = docTypes?.filter(d => d.allowed_role === 'TOUS') ?? [];
  const profs      = docTypes?.filter(d => d.allowed_role === 'PROFESSEUR') ?? [];
  const employes   = docTypes?.filter(d => d.allowed_role === 'EMPLOYE') ?? [];

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Types de documents</h1>
            <p className="text-sm text-gray-500">Gérez les documents administratifs disponibles</p>
          </div>
          <Button onClick={() => { cancel(); setShowForm(v => !v); }}>
            {showForm && !editing ? 'Annuler' : '+ Nouveau document'}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-6">
            <div className="border-b border-gray-100 px-6 py-4">
              <p className="font-semibold text-gray-900">
                {editing ? `Modifier : ${editing.nom_fr}` : 'Nouveau type de document'}
              </p>
            </div>
            <CardBody>
              <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} autoComplete="off">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Code *"
                    placeholder="ex: ATT-TRAV-FR"
                    error={errors.code?.message}
                    disabled={!!editing}
                    {...register('code')}
                  />
                  <Input
                    label="Nom français *"
                    placeholder="ex: Attestation de travail"
                    error={errors.nom_fr?.message}
                    {...register('nom_fr')}
                  />
                  <Input
                    label="Nom arabe"
                    placeholder="ex: شهادة عمل"
                    {...register('nom_ar')}
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Accessible à *</label>
                    <select
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      {...register('allowed_role')}
                    >
                      <option value="TOUS">Professeurs & Employés</option>
                      <option value="PROFESSEUR">Professeurs uniquement</option>
                      <option value="EMPLOYE">Employés uniquement</option>
                    </select>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <input type="checkbox" id="requires_language" {...register('requires_language')} />
                    <label htmlFor="requires_language" className="text-sm text-gray-700">
                      Ce document nécessite un choix de langue (français / arabe)
                    </label>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <Button type="submit" loading={isSubmitting}>
                    {editing ? 'Enregistrer' : 'Ajouter'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={cancel}>Annuler</Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}

        {isLoading ? (
          <p className="text-sm text-gray-400">Chargement…</p>
        ) : (
          <div className="flex flex-col gap-6">
            <DocGroup
              title="Demandes communes — Professeurs & Employés"
              items={tous}
              onEdit={startEdit}
              onToggle={d => toggleMutation.mutate(d)}
              onDelete={id => { if (confirm('Supprimer ce type de document ?')) deleteMutation.mutate(id); }}
            />
            <DocGroup
              title="Documents spécifiques aux Professeurs"
              items={profs}
              onEdit={startEdit}
              onToggle={d => toggleMutation.mutate(d)}
              onDelete={id => { if (confirm('Supprimer ce type de document ?')) deleteMutation.mutate(id); }}
            />
            <DocGroup
              title="Documents spécifiques aux Employés"
              items={employes}
              onEdit={startEdit}
              onToggle={d => toggleMutation.mutate(d)}
              onDelete={id => { if (confirm('Supprimer ce type de document ?')) deleteMutation.mutate(id); }}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}

function DocGroup({
  title, items, onEdit, onToggle, onDelete,
}: {
  title: string;
  items: DocumentType[];
  onEdit: (d: DocumentType) => void;
  onToggle: (d: DocumentType) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <Card>
      <div className="border-b border-gray-100 px-6 py-4">
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-400">{items.length} document{items.length > 1 ? 's' : ''}</p>
      </div>
      <CardBody className="p-0">
        {!items.length ? (
          <p className="px-6 py-5 text-sm text-gray-400 italic">Aucun document dans cette catégorie.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {items.map(d => (
              <li key={d.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className={`font-medium ${d.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                      {d.nom_fr}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[d.allowed_role]}`}>
                      {ROLE_LABELS[d.allowed_role]}
                    </span>
                    {d.requires_language && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">FR / AR</span>
                    )}
                  </div>
                  {d.nom_ar && (
                    <p className="mt-0.5 text-sm text-gray-400" dir="rtl">{d.nom_ar}</p>
                  )}
                  <p className="mt-0.5 font-mono text-xs text-gray-300">{d.code}</p>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <button
                    onClick={() => onToggle(d)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors
                      ${d.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {d.is_active ? 'Actif' : 'Inactif'}
                  </button>
                  <button
                    onClick={() => onEdit(d)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => onDelete(d.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
