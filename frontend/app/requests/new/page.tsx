'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { AuthUser, DocumentType } from '@/lib/types';

// Pre-fill payload fields from user profile
function buildPrefilledPayload(user: AuthUser | null): Record<string, string> {
  const p = user?.staff_profile;
  if (!p) return {};
  return {
    nom_fr:    p.nom_fr ?? '',
    prenom_fr: p.prenom_fr ?? '',
    nom_ar:    p.nom_ar ?? '',
    prenom_ar: p.prenom_ar ?? '',
    grade_fr:  p.grade?.intitule_fr ?? '',
    grade_ar:  p.grade?.intitule_ar ?? '',
    doti:      p.doti ?? '',
    unite_fr:  p.organizational_unit?.nom_fr ?? '',
    date_recrutement: p.date_recrutement ?? '',
  };
}

export default function NewRequestPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [language, setLanguage]         = useState('fr');
  const [payload, setPayload]           = useState<Record<string, string>>({});

  // Pre-fill when user profile is available
  useEffect(() => {
    setPayload(buildPrefilledPayload(user));
  }, [user]);

  const { data: docTypes } = useQuery<DocumentType[]>({
    queryKey: ['document-types'],
    queryFn: () => api.get('/document-types').then(r => r.data),
  });

  const allowedTypes = docTypes?.filter(t => {
    if (!t.is_active) return false;
    if (t.allowed_role === 'TOUS') return true;
    return t.allowed_role === user?.role;
  });

  const createMutation = useMutation({
    mutationFn: (draft: object) => api.post('/requests', draft).then(r => r.data),
    onError: (err) => toast.error(getApiError(err)),
  });

  const submitMutation = useMutation({
    mutationFn: (id: number) => api.post(`/requests/${id}/submit`).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`Demande ${data.reference ?? ''} soumise avec succès.`);
      router.push(`/requests/${data.id}`);
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const handleSaveDraft = async () => {
    if (!selectedType) return;
    const draft = await createMutation.mutateAsync({
      document_type_id: selectedType.id,
      language: selectedType.requires_language ? language : null,
      payload,
    });
    toast.success('Brouillon enregistré.');
    router.push(`/requests/${draft.id}`);
  };

  const handleSubmit = async () => {
    if (!selectedType) return;
    const draft = await createMutation.mutateAsync({
      document_type_id: selectedType.id,
      language: selectedType.requires_language ? language : null,
      payload,
    });
    submitMutation.mutate(draft.id);
  };

  const set = (key: string, value: string) =>
    setPayload(prev => ({ ...prev, [key]: value }));

  const isLoading = createMutation.isPending || submitMutation.isPending;

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle demande</h1>
          <p className="text-sm text-gray-500">Sélectionnez le type de document puis complétez les informations</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Type selector */}
          <div className="lg:col-span-1">
            <Card>
              <div className="border-b border-gray-100 px-5 py-4">
                <p className="font-semibold text-gray-900">Type de document</p>
              </div>
              <CardBody className="p-2">
                {!allowedTypes ? (
                  <p className="py-4 text-center text-sm text-gray-400">Chargement…</p>
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {allowedTypes.map(t => (
                      <li key={t.id}>
                        <button
                          onClick={() => setSelectedType(t)}
                          className={`w-full rounded-lg px-3 py-3 text-left text-sm transition-colors
                            ${selectedType?.id === t.id
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          <span className="block">{t.nom_fr}</span>
                          {t.nom_ar && (
                            <span className="block text-xs text-gray-400 mt-0.5" dir="rtl">{t.nom_ar}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <Card>
              <div className="border-b border-gray-100 px-6 py-4">
                <p className="font-semibold text-gray-900">
                  {selectedType ? selectedType.nom_fr : 'Détails de la demande'}
                </p>
                {selectedType?.nom_ar && (
                  <p className="text-sm text-gray-400" dir="rtl">{selectedType.nom_ar}</p>
                )}
              </div>
              <CardBody>
                {!selectedType ? (
                  <div className="flex flex-col items-center py-12 text-center">
                    <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <p className="text-sm text-gray-400">Sélectionnez un type de document à gauche</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {/* Pre-filled identity block */}
                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-600">
                        Informations pré-remplies depuis votre profil
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <ReadonlyField label="Nom (FR)" value={payload.nom_fr} />
                        <ReadonlyField label="Prénom (FR)" value={payload.prenom_fr} />
                        {payload.nom_ar && <ReadonlyField label="الاسم" value={payload.nom_ar} dir="rtl" />}
                        {payload.prenom_ar && <ReadonlyField label="الاسم الشخصي" value={payload.prenom_ar} dir="rtl" />}
                        <ReadonlyField label="Grade" value={payload.grade_fr} />
                        <ReadonlyField label="N° Matricule" value={payload.doti} />
                        <ReadonlyField label="Département" value={payload.unite_fr} />
                        <ReadonlyField label="Date de recrutement" value={payload.date_recrutement} />
                      </div>
                    </div>

                    {/* Language selector */}
                    {selectedType.requires_language && (
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Langue du document *</label>
                        <select
                          value={language}
                          onChange={e => setLanguage(e.target.value)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="fr">Français</option>
                          <option value="ar">Arabe</option>
                        </select>
                      </div>
                    )}

                    {/* Dynamic fields */}
                    <PayloadFields
                      typeCode={selectedType.code}
                      payload={payload}
                      onChange={set}
                    />

                    <div className="flex gap-3 border-t border-gray-100 pt-4">
                      <Button variant="secondary" onClick={handleSaveDraft} loading={createMutation.isPending && !submitMutation.isPending} disabled={isLoading}>
                        Enregistrer brouillon
                      </Button>
                      <Button onClick={handleSubmit} loading={submitMutation.isPending} disabled={isLoading}>
                        Soumettre la demande
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ReadonlyField({ label, value, dir }: { label: string; value?: string; dir?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-blue-500">{label}</p>
      <p className="text-sm font-medium text-gray-800" dir={dir}>{value}</p>
    </div>
  );
}

function PayloadFields({
  typeCode,
  payload,
  onChange,
}: {
  typeCode: string;
  payload: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const f = (key: string, label: string, type = 'text', required = false) => (
    <Input
      key={key}
      label={label + (required ? ' *' : '')}
      type={type}
      value={payload[key] ?? ''}
      onChange={e => onChange(key, e.target.value)}
    />
  );

  if (['ATT-TRAV-FR', 'ATT-TRAV-AR', 'ATT-SAL', 'ATT-HAB'].includes(typeCode)) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-500">Aucun champ supplémentaire requis — vos informations de profil suffisent.</p>
      </div>
    );
  }

  if (typeCode === 'ODM') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {f('destination', 'Destination', 'text', true)}
        {f('objet', 'Objet de la mission', 'text', true)}
        {f('date_debut', 'Date de départ', 'date', true)}
        {f('date_fin', 'Date de retour', 'date', true)}
        {f('moyen_transport', 'Moyen de transport')}
      </div>
    );
  }

  if (typeCode === 'AQT') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {f('destination', 'Pays / Destination', 'text', true)}
        {f('date_debut', 'Date de début', 'date', true)}
        {f('date_fin', 'Date de fin', 'date', true)}
        {f('motif', 'Motif (optionnel)')}
      </div>
    );
  }

  if (typeCode === 'CARTE-NOT') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Critères de notation (sur 20)</p>
        <div className="grid grid-cols-2 gap-3">
          {f('annee_evaluation', "Année d'évaluation", 'number', true)}
          {f('rang_echelon', 'Rang / Échelon')}
          <ScoreInput label="Réalisation des tâches (/ 5)" max={5} value={payload.note_taches ?? ''} onChange={v => onChange('note_taches', v)} />
          <ScoreInput label="Productivité (/ 5)" max={5} value={payload.note_productivite ?? ''} onChange={v => onChange('note_productivite', v)} />
          <ScoreInput label="Organisation (/ 3)" max={3} value={payload.note_organisation ?? ''} onChange={v => onChange('note_organisation', v)} />
          <ScoreInput label="Comportement professionnel (/ 4)" max={4} value={payload.note_comportement ?? ''} onChange={v => onChange('note_comportement', v)} />
          <ScoreInput label="Recherche et innovation (/ 3)" max={3} value={payload.note_recherche ?? ''} onChange={v => onChange('note_recherche', v)} />
        </div>
        <NoteTotal payload={payload} />
      </div>
    );
  }

  if (typeCode === 'PV-REPRISE') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {f('type_conge', 'Type de congé', 'text', true)}
        {f('date_debut', 'Date début congé', 'date', true)}
        {f('date_fin', 'Date fin congé', 'date', true)}
        {f('date_reprise', 'Date de reprise', 'date', true)}
      </div>
    );
  }

  if (typeCode === 'CONGE-ADM') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {f('date_debut', 'Date de début', 'date', true)}
        {f('date_fin', 'Date de fin', 'date', true)}
        {f('commentaire', 'Commentaire')}
        <NbJours payload={payload} />
      </div>
    );
  }

  return null;
}

function ScoreInput({ label, max, value, onChange }: { label: string; max: number; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type="number" min={0} max={max} step={0.5}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

function NoteTotal({ payload }: { payload: Record<string, string> }) {
  const total = ['note_taches', 'note_productivite', 'note_organisation', 'note_comportement', 'note_recherche']
    .reduce((sum, k) => sum + (parseFloat(payload[k] ?? '0') || 0), 0);

  const appreciation =
    total >= 18 ? 'Très bien' :
    total >= 15 ? 'Bien' :
    total >= 12 ? 'Assez bien' :
    total >= 10 ? 'Passable' : 'Insuffisant';

  return (
    <div className="col-span-2 rounded-lg bg-gray-50 px-4 py-3">
      <span className="text-sm font-semibold text-gray-700">Total : </span>
      <span className="text-lg font-bold text-blue-700">{total.toFixed(1)} / 20</span>
      <span className="ml-3 text-sm text-gray-500">— {appreciation}</span>
      <p className="text-xs text-gray-400 mt-1">Calculé automatiquement côté serveur à la validation.</p>
    </div>
  );
}

function NbJours({ payload }: { payload: Record<string, string> }) {
  if (!payload.date_debut || !payload.date_fin) return null;
  const diff = Math.ceil((new Date(payload.date_fin).getTime() - new Date(payload.date_debut).getTime()) / 86400000) + 1;
  if (diff <= 0) return null;
  return (
    <div className="col-span-2 rounded-lg bg-gray-50 px-4 py-3">
      <span className="text-sm font-semibold text-gray-700">Nombre de jours : </span>
      <span className="text-lg font-bold text-blue-700">{diff}</span>
    </div>
  );
}
