'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { DocumentType } from '@/lib/types';

// Identity fields (name, grade, matricule, recruitment date…) are NOT part of
// the payload: the backend reads them straight from the requester's profile
// when generating the PDF. Keeping them out of the payload avoids leaking empty
// profile values (e.g. "date recrutement: NULL") into the admin's request view.

// Required payload fields per document type code.
// Keep in sync with the backend (RequestController::REQUIRED_PAYLOAD_FIELDS).
const REQUIRED_FIELDS: Record<string, string[]> = {
  ODM:          ['destination', 'objet', 'date_debut', 'date_fin'],
  AQT:          ['destination', 'date_debut', 'date_fin'],
  'ATT-HAB':    ['date_habilitation'],
  'PV-REPRISE': ['type_conge', 'date_debut', 'date_fin', 'date_reprise'],
  'CONGE-ADM':  ['date_debut', 'date_fin', 'date_reprise'],
  'CARTE-NOT':  ['annee_evaluation'],
};

function getMissingFields(typeCode: string, payload: Record<string, string>): string[] {
  const required = REQUIRED_FIELDS[typeCode] ?? [];
  return required.filter(k => !(payload[k] ?? '').toString().trim());
}

export default function NewRequestPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [language, setLanguage]         = useState('fr');
  const [payload, setPayload]           = useState<Record<string, string>>({});
  const [showErrors, setShowErrors]     = useState(false);

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

    // Block submission until every required field is filled.
    const missing = getMissingFields(selectedType.code, payload);
    if (missing.length > 0) {
      setShowErrors(true);
      toast.error('Veuillez remplir tous les champs obligatoires avant de soumettre.');
      return;
    }

    const draft = await createMutation.mutateAsync({
      document_type_id: selectedType.id,
      language: selectedType.requires_language ? language : null,
      payload,
    });
    submitMutation.mutate(draft.id);
  };

  const set = (key: string, value: string) =>
    setPayload(prev => ({ ...prev, [key]: value }));

  const missingFields = selectedType ? getMissingFields(selectedType.code, payload) : [];
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
                          onClick={() => { setSelectedType(t); setShowErrors(false); }}
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
                        <ReadonlyField label="Nom (FR)" value={user?.staff_profile?.nom_fr} />
                        <ReadonlyField label="Prénom (FR)" value={user?.staff_profile?.prenom_fr} />
                        {user?.staff_profile?.nom_ar && <ReadonlyField label="الاسم" value={user.staff_profile.nom_ar} dir="rtl" />}
                        {user?.staff_profile?.prenom_ar && <ReadonlyField label="الاسم الشخصي" value={user.staff_profile.prenom_ar} dir="rtl" />}
                        {user?.staff_profile?.grade?.intitule_fr && <ReadonlyField label="Grade" value={user.staff_profile.grade.intitule_fr} />}
                        {user?.staff_profile?.doti && <ReadonlyField label="N° Matricule" value={user.staff_profile.doti} />}
                        {user?.staff_profile?.organizational_unit?.nom_fr && <ReadonlyField label="Département" value={user.staff_profile.organizational_unit.nom_fr} />}
                        {user?.staff_profile?.date_recrutement && <ReadonlyField label="Date de recrutement" value={user.staff_profile.date_recrutement} />}
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
                      showErrors={showErrors}
                    />

                    {showErrors && missingFields.length > 0 && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                        <p className="text-sm font-medium text-red-700">
                          Veuillez remplir tous les champs obligatoires (*) avant de soumettre.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3 border-t border-gray-100 pt-4">
                      <Button variant="secondary" onClick={handleSaveDraft} loading={createMutation.isPending && !submitMutation.isPending} disabled={isLoading}>
                        Enregistrer brouillon
                      </Button>
                      <Button onClick={handleSubmit} loading={submitMutation.isPending} disabled={isLoading || missingFields.length > 0}>
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
  showErrors = false,
}: {
  typeCode: string;
  payload: Record<string, string>;
  onChange: (key: string, value: string) => void;
  showErrors?: boolean;
}) {
  const f = (key: string, label: string, type = 'text', required = false) => {
    const isMissing = required && showErrors && !(payload[key] ?? '').toString().trim();
    return (
      <Input
        key={key}
        label={label + (required ? ' *' : '')}
        type={type}
        value={payload[key] ?? ''}
        onChange={e => onChange(key, e.target.value)}
        error={isMissing ? ' ' : undefined}
      />
    );
  };

  if (['ATT-TRAV-FR', 'ATT-TRAV-AR', 'ATT-SAL'].includes(typeCode)) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-500">Aucun champ supplémentaire requis — vos informations de profil suffisent.</p>
      </div>
    );
  }

  if (typeCode === 'ATT-HAB') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {f('date_habilitation', "Date d'habilitation", 'date', true)}
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
    // La carte de notation s'imprime vierge : seuls les champs d'identité (issus
    // du profil) et l'année sont pré-remplis ; la notation est faite à la main
    // par la hiérarchie. On ne demande donc que l'année d'évaluation.
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          {f('annee_evaluation', "Année d'évaluation", 'number', true)}
        </div>
        <p className="text-xs text-gray-500">
          La carte est générée vierge (identité pré-remplie). Les notes sont attribuées manuellement par la hiérarchie.
        </p>
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
        {f('date_reprise', 'Date de reprise du travail', 'date', true)}
        <NbJours payload={payload} />
      </div>
    );
  }

  return null;
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
