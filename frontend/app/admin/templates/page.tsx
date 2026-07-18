'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { DocumentTemplate, DocumentType, Paginated } from '@/lib/types';

const VARIABLES_HELP = `Variables disponibles :
{{ user.nom_fr }}  {{ user.prenom_fr }}  {{ user.nom_ar }}  {{ user.prenom_ar }}
{{ user.doti }}    {{ user.grade_fr }}   {{ user.grade_ar }}  {{ user.unite_fr }}
{{ user.date_recrutement }}
{{ request.reference }}  {{ request.date_edition }}
{{ request.destination }}  {{ request.date_debut }}  {{ request.date_fin }}
{{ request.objet }}  {{ request.motif }}`;

export default function AdminTemplatesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<DocumentTemplate | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<{
    document_type_id: string;
    language: string;
    role_target: string;
    content: string;
    is_active: boolean;
  }>({ defaultValues: { language: 'fr', role_target: '', is_active: true } });

  const { data: docTypes } = useQuery<DocumentType[]>({
    queryKey: ['document-types'],
    queryFn: () => api.get('/document-types').then(r => r.data),
  });

  const { data: templates } = useQuery<Paginated<DocumentTemplate>>({
    queryKey: ['templates'],
    queryFn: () => api.get('/admin/templates').then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data: object) =>
      editing
        ? api.patch(`/admin/templates/${editing.id}`, data)
        : api.post('/admin/templates', data),
    onSuccess: () => {
      toast.success(editing ? 'Template mis à jour.' : 'Template créé.');
      qc.invalidateQueries({ queryKey: ['templates'] });
      reset(); setEditing(null); setShowForm(false);
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  const toggleMutation = useMutation({
    mutationFn: (t: DocumentTemplate) => api.patch(`/admin/templates/${t.id}`, { is_active: !t.is_active }),
    onSuccess: () => { toast.success('Statut mis à jour.'); qc.invalidateQueries({ queryKey: ['templates'] }); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const previewMutation = useMutation({
    mutationFn: (id: number) => api.get(`/admin/templates/${id}/preview`).then(r => r.data.html),
    onSuccess: (html: string) => setPreview(html),
    onError: (e) => toast.error(getApiError(e)),
  });

  const startEdit = (t: DocumentTemplate) => {
    setEditing(t);
    setValue('document_type_id', String(t.document_type_id));
    setValue('language', t.language);
    setValue('role_target', t.role_target ?? '');
    setValue('content', t.content);
    setValue('is_active', t.is_active);
    setShowForm(true);
  };

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Templates de documents</h1>
            <p className="text-sm text-gray-500">Modèles HTML utilisés pour la génération PDF</p>
          </div>
          <Button onClick={() => { setEditing(null); reset(); setShowForm(v => !v); }}>
            {showForm ? 'Fermer' : 'Nouveau template'}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-6">
            <div className="border-b border-gray-100 px-6 py-4">
              <p className="font-semibold text-gray-900">{editing ? `Modifier template v${editing.version}` : 'Nouveau template'}</p>
            </div>
            <CardBody>
              <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Type de document *</label>
                    <select
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={!!editing}
                      {...register('document_type_id')}
                    >
                      <option value="">— Sélectionner —</option>
                      {docTypes?.map(t => <option key={t.id} value={t.id}>{t.nom_fr}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Langue *</label>
                    <select
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={!!editing}
                      {...register('language')}
                    >
                      <option value="fr">Français</option>
                      <option value="ar">Arabe</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Rôle cible</label>
                    <select
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={!!editing}
                      {...register('role_target')}
                    >
                      <option value="">— Tous —</option>
                      <option value="PROFESSEUR">Professeur</option>
                      <option value="EMPLOYE">Employé</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Contenu HTML *</label>
                    <details className="text-xs text-gray-400 cursor-pointer">
                      <summary>Variables disponibles</summary>
                      <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-100 p-2 text-xs text-gray-600">{VARIABLES_HELP}</pre>
                    </details>
                  </div>
                  <textarea
                    rows={16}
                    className="rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="<html><body>...</body></html>"
                    {...register('content')}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="is_active" {...register('is_active')} />
                  <label htmlFor="is_active" className="text-sm text-gray-700">Activer immédiatement (désactive les versions précédentes)</label>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" loading={isSubmitting}>
                    {editing ? 'Mettre à jour' : 'Créer le template'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditing(null); reset(); }}>
                    Annuler
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}

        {/* Preview modal */}
        {preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex h-[80vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <p className="font-semibold text-gray-900">Aperçu du template</p>
                <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>✕ Fermer</Button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <iframe
                  srcDoc={preview}
                  className="h-full w-full rounded border border-gray-200"
                  title="Aperçu template"
                />
              </div>
            </div>
          </div>
        )}

        {/* List */}
        <Card>
          <CardBody className="p-0">
            {!templates?.data.length ? (
              <p className="px-6 py-10 text-center text-sm text-gray-400">Aucun template. Créez-en un pour pouvoir générer des PDFs.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    <th className="px-6 py-3">Type de document</th>
                    <th className="px-6 py-3">Langue</th>
                    <th className="px-6 py-3">Rôle</th>
                    <th className="px-6 py-3">Version</th>
                    <th className="px-6 py-3">Statut</th>
                    <th className="px-6 py-3">Créé le</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {templates.data.map(t => (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{t.document_type?.nom_fr ?? '—'}</td>
                      <td className="px-6 py-3">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase text-gray-600">{t.language}</span>
                      </td>
                      <td className="px-6 py-3">
                        {t.role_target
                          ? <span className={`rounded px-2 py-0.5 text-xs font-medium ${t.role_target === 'PROFESSEUR' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{t.role_target === 'PROFESSEUR' ? 'Professeur' : 'Employé'}</span>
                          : <span className="text-xs text-gray-400">Tous</span>
                        }
                      </td>
                      <td className="px-6 py-3 text-gray-500">v{t.version}</td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => toggleMutation.mutate(t)}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${t.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                          {t.is_active ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-400">
                        {new Date(t.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex gap-3">
                          <button onClick={() => previewMutation.mutate(t.id)} className="text-xs text-gray-500 hover:text-gray-700 hover:underline">
                            Aperçu
                          </button>
                          <button onClick={() => startEdit(t)} className="text-xs text-blue-600 hover:underline">
                            Modifier
                          </button>
                        </div>
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
