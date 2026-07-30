'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RoleBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ProfileView } from '@/components/profile/ProfileView';
import type { AccountOverview, User } from '@/lib/types';

/**
 * Champs modifiables par l'agent lui-même. Le serveur applique la même liste :
 * l'administration seule peut toucher au matricule, au grade, à l'affectation
 * ou aux soldes de congé.
 */
type ProfileForm = {
  nom_fr: string;
  prenom_fr: string;
  nom_ar: string;
  prenom_ar: string;
  sexe: string;
  date_naissance: string;
  lieu_naissance: string;
  telephone: string;
  fonction: string;
  cin: string;
  doti: string;
  specialite: string;
  fonction_actuelle: string;
  situation_familiale: string;
  nombre_enfants: string;
  situation_administrative: string;
  date_recrutement: string;
};

const EMPTY: ProfileForm = {
  nom_fr: '', prenom_fr: '', nom_ar: '', prenom_ar: '', sexe: '',
  date_naissance: '', lieu_naissance: '', telephone: '', fonction: '', cin: '', doti: '',
  specialite: '', fonction_actuelle: '', situation_familiale: '',
  nombre_enfants: '', situation_administrative: '', date_recrutement: '',
};

function LockIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={`h-3.5 w-3.5 ${className}`}>
      <path fillRule="evenodd" d="M10 1a4 4 0 00-4 4v2H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-1V5a4 4 0 00-4-4zm2 6V5a2 2 0 10-4 0v2h4z" clipRule="evenodd" />
    </svg>
  );
}

/** Donnée gérée par l'administration : affichée pour information, non éditable. */
function LockedField({ label, value }: { label: string; value?: string | number | null }) {
  const shown = value === null || value === undefined || value === '' ? '—' : String(value);

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
        {label}
        <LockIcon className="text-gray-400" />
      </label>
      <div
        title="Donnée gérée par l'administration"
        className="flex items-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
      >
        {shown}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const qc = useQueryClient();

  const [tab, setTab] = useState<'view' | 'edit'>('view');
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/profile').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<ProfileForm>({
    defaultValues: EMPTY,
  });

  const profile = user?.staff_profile;
  const role = user?.role ?? authUser?.role;
  const isAdmin = role === 'ADMIN';

  // Le profil administrateur n'ayant pas de dossier RH, la section « Compte »
  // (rôle, statut, dernière connexion) prend la place de celui-ci.
  const { data: account } = useQuery<AccountOverview>({
    queryKey: ['account-overview'],
    queryFn: () => api.get('/account/overview').then(r => r.data),
    enabled: isAdmin,
  });

  // Le serveur redéduit ce type du rôle ; on le reproduit ici uniquement pour
  // n'afficher et n'envoyer que les champs du sous-profil concerné.
  const staffType = profile?.staff_type
    ?? (role === 'PROFESSEUR' ? 'PROFESSEUR' : role === 'ADMIN' ? 'ADMIN' : 'EMPLOYE');

  useEffect(() => {
    if (!profile) return;
    reset({
      nom_fr:              profile.nom_fr ?? '',
      prenom_fr:           profile.prenom_fr ?? '',
      nom_ar:              profile.nom_ar ?? '',
      prenom_ar:           profile.prenom_ar ?? '',
      sexe:                profile.sexe ?? '',
      date_naissance:      profile.date_naissance ?? '',
      lieu_naissance:      profile.lieu_naissance ?? '',
      telephone:           profile.telephone ?? '',
      fonction:            profile.fonction ?? '',
      cin:                 profile.cin ?? '',
      doti:                profile.doti ?? '',
      specialite:          profile.professor_profile?.specialite ?? '',
      fonction_actuelle:   profile.employee_profile?.fonction_actuelle ?? '',
      situation_familiale: profile.employee_profile?.situation_familiale ?? '',
      nombre_enfants:      profile.employee_profile?.nombre_enfants != null
        ? String(profile.employee_profile.nombre_enfants)
        : '',
      situation_administrative: profile.situation_administrative ?? '',
      date_recrutement:         profile.date_recrutement ?? '',
    });
  }, [profile, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: ProfileForm) => {
      const payload: Record<string, string | null> = {
        nom_fr:         data.nom_fr,
        prenom_fr:      data.prenom_fr,
        nom_ar:         data.nom_ar || null,
        prenom_ar:      data.prenom_ar || null,
        sexe:           data.sexe || null,
        date_naissance: data.date_naissance || null,
        lieu_naissance: data.lieu_naissance || null,
        telephone:      data.telephone || null,
      };

      // Un administrateur n'a pas de sous-profil : envoyer ces champs lui
      // recréerait le dossier RH que l'on vient précisément de retirer.
      if (staffType === 'PROFESSEUR') {
        payload.specialite = data.specialite || null;
      } else if (staffType === 'EMPLOYE') {
        payload.fonction_actuelle   = data.fonction_actuelle || null;
        payload.situation_familiale = data.situation_familiale || null;
        payload.nombre_enfants      = data.nombre_enfants || null;
      } else {
        payload.fonction = data.fonction || null;
      }

      return profile ? api.patch('/profile', payload) : api.post('/profile', payload);
    },
    onSuccess: () => {
      toast.success('Profil enregistré.');
      qc.invalidateQueries({ queryKey: ['my-profile'] });
      setTab('view');
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  const photoMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('photo', file);
      return api.post('/profile/photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Photo mise à jour.');
      qc.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: () => api.delete('/profile/photo'),
    onSuccess: () => {
      toast.success('Photo supprimée.');
      qc.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
        </div>
      </AppShell>
    );
  }

  const initials = profile
    ? `${profile.prenom_fr?.[0] ?? ''}${profile.nom_fr?.[0] ?? ''}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) photoMutation.mutate(file);
    e.target.value = '';
  };

  const ep = profile?.employee_profile;
  const pp = profile?.professor_profile;

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
          <p className="text-sm text-gray-500">
            Consultez votre dossier et mettez à jour vos informations personnelles
          </p>
        </div>

        <Card className="mb-6">
          <CardBody className="flex flex-col gap-5 py-6 sm:flex-row sm:items-center">
            <div className="flex flex-col items-center gap-2">
              <Avatar photoUrl={profile?.photo_url} initials={initials} size="xl" />
              {profile ? (
                <>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={onPickPhoto}
                  />
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={photoMutation.isPending}
                    className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {photoMutation.isPending ? 'Envoi…' : 'Changer la photo'}
                  </button>
                  {profile.photo_url && (
                    <button
                      type="button"
                      onClick={() => { if (confirm('Supprimer la photo de profil ?')) deletePhotoMutation.mutate(); }}
                      disabled={deletePhotoMutation.isPending}
                      className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
                    >
                      {deletePhotoMutation.isPending ? 'Suppression…' : 'Supprimer la photo'}
                    </button>
                  )}
                </>
              ) : (
                <span className="text-center text-xs text-gray-400">
                  Enregistrez le profil<br />pour ajouter une photo
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">
                  {profile ? `${profile.prenom_fr} ${profile.nom_fr}` : user?.email}
                </h2>
                <RoleBadge role={role ?? ''} />
              </div>
              {profile?.nom_ar && (
                <p className="text-sm text-gray-400" dir="rtl">{profile.prenom_ar} {profile.nom_ar}</p>
              )}
              <p className="text-sm text-gray-500">{user?.email}</p>
              {/* Repères du dossier RH : sans objet pour un administrateur. */}
              {!isAdmin && (
                <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                  {profile?.doti && (
                    <span>Matricule : <span className="font-mono text-gray-700">{profile.doti}</span></span>
                  )}
                  {profile?.grade?.intitule_fr && (
                    <span>Grade : <span className="text-gray-700">{profile.grade.intitule_fr}</span></span>
                  )}
                  {profile?.organizational_unit?.nom_fr && (
                    <span>Département : <span className="text-gray-700">{profile.organizational_unit.nom_fr}</span></span>
                  )}
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="mb-6 flex gap-1 border-b border-gray-200">
          {(['view', 'edit'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors
                ${tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'view' ? "Vue d'ensemble" : 'Modifier'}
            </button>
          ))}
        </div>

        {tab === 'view' && (
          profile ? (
            <ProfileView profile={profile} email={user?.email} isAdmin={isAdmin} account={account} />
          ) : (
            <Card>
              <CardBody className="py-10 text-center text-sm text-gray-500">
                Aucun profil renseigné. Passez à l&apos;onglet{' '}
                <button onClick={() => setTab('edit')} className="text-blue-600 hover:underline">Modifier</button>{' '}
                pour le compléter.
              </CardBody>
            </Card>
          )
        )}

        {tab === 'edit' && (
          <form
            onSubmit={handleSubmit(d => saveMutation.mutate(d))}
            className="flex flex-col gap-6"
            autoComplete="off"
          >
            {isAdmin ? (
              <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <span className="mt-0.5 inline-block h-3.5 w-3.5 rounded-full bg-blue-500" />
                <p>
                  Un compte administrateur ne relève pas du dossier RH : ni grade, ni matricule,
                  ni solde de congé. Seules votre identité et vos coordonnées sont enregistrées.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <LockIcon className="mt-0.5 shrink-0 text-blue-500" />
                <p>
                  Les champs marqués d&apos;un cadenas relèvent de votre dossier administratif
                  (matricule, grade, affectation, congés). Pour toute correction, adressez-vous
                  au service des ressources humaines.
                </p>
              </div>
            )}

            <Card>
              <div className="border-b border-gray-100 px-6 py-4">
                <p className="font-semibold text-gray-900">Identité</p>
              </div>
              <CardBody>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Nom (FR)" {...register('nom_fr')} />
                  <Input label="Prénom (FR)" {...register('prenom_fr')} />
                  <Input label="Nom (AR)" dir="rtl" {...register('nom_ar')} />
                  <Input label="Prénom (AR)" dir="rtl" {...register('prenom_ar')} />
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Sexe</label>
                    <select
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      {...register('sexe')}
                    >
                      <option value="">— Sélectionner —</option>
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  </div>
                  <Input label="Date de naissance" type="date" {...register('date_naissance')} />
                  <Input label="Lieu de naissance" {...register('lieu_naissance')} />
                  <Input label="Téléphone" type="tel" placeholder="+212 6XX XXX XXX" {...register('telephone')} />
                  {isAdmin ? (
                    <Input label="Fonction / Poste" placeholder="ex : Chef du service RH" {...register('fonction')} />
                  ) : (
                    <>
                      <LockedField label="CIN" value={profile?.cin} />
                      <LockedField label="N° Matricule (DOTI)" value={profile?.doti} />
                    </>
                  )}
                </div>
              </CardBody>
            </Card>

            {!isAdmin && (
              <>
                <Card>
                  <div className="border-b border-gray-100 px-6 py-4">
                    <p className="font-semibold text-gray-900">Situation administrative</p>
                    <p className="mt-0.5 text-xs text-gray-500">Géré par le service RH — lecture seule</p>
                  </div>
                  <CardBody>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <LockedField label="Situation administrative" value={profile?.situation_administrative} />
                      <LockedField label="Date de recrutement" value={profile?.date_recrutement} />
                      <LockedField label="Grade" value={profile?.grade?.intitule_fr} />
                      <LockedField label="Département" value={profile?.organizational_unit?.nom_fr} />
                    </div>
                  </CardBody>
                </Card>

                {staffType === 'PROFESSEUR' && (
                  <Card>
                    <div className="border-b border-gray-100 px-6 py-4">
                      <p className="font-semibold text-gray-900">Profil Professeur</p>
                    </div>
                    <CardBody>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input label="Spécialité" placeholder="ex : Génie logiciel" {...register('specialite')} />
                        <LockedField label="Date de prise de fonction" value={pp?.date_prise_fonction} />
                        <LockedField label="Date d'habilitation" value={pp?.date_habilitation} />
                      </div>
                    </CardBody>
                  </Card>
                )}

                {staffType === 'EMPLOYE' && (
                  <Card>
                    <div className="border-b border-gray-100 px-6 py-4">
                      <p className="font-semibold text-gray-900">Profil Employé</p>
                    </div>
                    <CardBody>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input label="Fonction actuelle" {...register('fonction_actuelle')} />
                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium text-gray-700">Situation familiale</label>
                          <select
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            {...register('situation_familiale')}
                          >
                            <option value="">— Sélectionner —</option>
                            <option value="Célibataire">Célibataire</option>
                            <option value="Marié(e)">Marié(e)</option>
                            <option value="Divorcé(e)">Divorcé(e)</option>
                            <option value="Veuf/Veuve">Veuf/Veuve</option>
                          </select>
                        </div>
                        <Input label="Nombre d'enfants" type="number" min={0} {...register('nombre_enfants')} />
                        <LockedField label="Date d'affectation" value={ep?.date_affectation} />
                        <LockedField label="Ancienneté" value={ep?.anciennete} />
                        <LockedField label="Solde congé (jours)" value={ep?.solde_conge} />
                        <LockedField label="Congé reporté (jours)" value={ep?.conge_reporte} />
                      </div>
                    </CardBody>
                  </Card>
                )}
              </>
            )}

            <div className="flex items-center justify-end gap-3">
              {isDirty && <span className="text-xs text-amber-600">Modifications non enregistrées</span>}
              <Button type="submit" loading={saveMutation.isPending}>
                Enregistrer
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
