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
import type { Grade, OrganizationalUnit, User } from '@/lib/types';

type ProfileForm = Record<string, string>;

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const qc = useQueryClient();

  const [tab, setTab] = useState<'view' | 'edit'>('view');
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/profile').then(r => r.data),
  });

  const { data: grades } = useQuery<Grade[]>({
    queryKey: ['grades'],
    queryFn: () => api.get('/grades').then(r => r.data),
  });

  const { data: units } = useQuery<OrganizationalUnit[]>({
    queryKey: ['org-units'],
    queryFn: () => api.get('/organizational-units').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ProfileForm>({});

  const profile = user?.staff_profile;
  const role = user?.role ?? authUser?.role;
  const staffType = profile?.staff_type ?? (role === 'PROFESSEUR' ? 'PROFESSEUR' : 'EMPLOYE');

  const hydrated = useRef(false);

  useEffect(() => {
    if (!profile || !grades || !units || hydrated.current) return;
    hydrated.current = true;
    reset({
      nom_fr:                   profile.nom_fr ?? '',
      prenom_fr:                profile.prenom_fr ?? '',
      nom_ar:                   profile.nom_ar ?? '',
      prenom_ar:                profile.prenom_ar ?? '',
      sexe:                     profile.sexe ?? '',
      date_naissance:           profile.date_naissance ?? '',
      lieu_naissance:           profile.lieu_naissance ?? '',
      cin:                      profile.cin ?? '',
      doti:                     profile.doti ?? '',
      telephone:                profile.telephone ?? '',
      situation_administrative: profile.situation_administrative ?? '',
      date_recrutement:         profile.date_recrutement ?? '',
      grade_id:                 String(profile.grade?.id ?? ''),
      organizational_unit_id:   String(profile.organizational_unit?.id ?? ''),
      date_affectation:         profile.employee_profile?.date_affectation ?? '',
      fonction_actuelle:        profile.employee_profile?.fonction_actuelle ?? '',
      situation_familiale:      profile.employee_profile?.situation_familiale ?? '',
      nombre_enfants:           String(profile.employee_profile?.nombre_enfants ?? '0'),
      anciennete:               profile.employee_profile?.anciennete ?? '',
      solde_conge:              String(profile.employee_profile?.solde_conge ?? '0'),
      conge_reporte:            String(profile.employee_profile?.conge_reporte ?? '0'),
      specialite:               profile.professor_profile?.specialite ?? '',
      date_prise_fonction:      profile.professor_profile?.date_prise_fonction ?? '',
      date_habilitation:        profile.professor_profile?.date_habilitation ?? '',
      laboratoire_id:           String(profile.professor_profile?.laboratoire_id ?? ''),
    });
  }, [profile, grades, units, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: ProfileForm) => {
      if (profile) return api.patch('/profile', data);
      return api.post('/profile', { ...data, staff_type: staffType });
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

  if (isLoading) return <AppShell><div className="p-8 text-sm text-gray-400">Chargement…</div></AppShell>;

  // Flatten org units for selects
  const flatUnits: OrganizationalUnit[] = [];
  units?.forEach(u => { flatUnits.push(u); u.children?.forEach(c => flatUnits.push(c)); });
  const departments  = flatUnits.filter(u => u.type === 'DEPARTEMENT');
  const labos        = flatUnits.filter(u => u.type === 'LABORATOIRE');
  const filteredGrades = grades?.filter(g => !g.staff_type || g.staff_type === staffType);

  const initials = profile
    ? `${profile.prenom_fr?.[0] ?? ''}${profile.nom_fr?.[0] ?? ''}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) photoMutation.mutate(file);
    e.target.value = '';
  };

  const sel = (name: string, label: string, options: { value: string; label: string }[]) => (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        {...register(name)}
      >
        <option value="">— Sélectionner —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
          <p className="text-sm text-gray-500">Gérez vos informations et votre photo</p>
        </div>

        {/* Header card */}
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
                <span className="text-center text-xs text-gray-400">Enregistrez le profil<br />pour ajouter une photo</span>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">
                  {profile ? `${profile.prenom_fr} ${profile.nom_fr}` : user?.email}
                </h2>
                <RoleBadge role={role ?? ''} />
              </div>
              {profile?.nom_ar && <p className="text-sm text-gray-400" dir="rtl">{profile.prenom_ar} {profile.nom_ar}</p>}
              <p className="text-sm text-gray-500">{user?.email}</p>
              <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                {profile?.doti && <span>Matricule : <span className="font-mono text-gray-700">{profile.doti}</span></span>}
                {profile?.grade?.intitule_fr && <span>Grade : <span className="text-gray-700">{profile.grade.intitule_fr}</span></span>}
                {profile?.organizational_unit?.nom_fr && <span>Département : <span className="text-gray-700">{profile.organizational_unit.nom_fr}</span></span>}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Tabs */}
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
              {t === 'view' ? "Vue d'ensemble" : 'Édition'}
            </button>
          ))}
        </div>

        {/* View tab */}
        {tab === 'view' && (
          profile
            ? <ProfileView profile={profile} email={user?.email} />
            : (
              <Card>
                <CardBody className="py-10 text-center text-sm text-gray-500">
                  Aucun profil renseigné. Passez à l'onglet{' '}
                  <button onClick={() => setTab('edit')} className="text-blue-600 hover:underline">Édition</button>{' '}
                  pour le créer.
                </CardBody>
              </Card>
            )
        )}

        {/* Edit tab */}
        {tab === 'edit' && (
          <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="flex flex-col gap-6" autoComplete="off">
            <Card>
              <div className="border-b border-gray-100 px-6 py-4">
                <p className="font-semibold text-gray-900">Identité</p>
              </div>
              <CardBody>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Nom (FR)" {...register('nom_fr')} />
                  <Input label="Prénom (FR)" {...register('prenom_fr')} />
                  <Input label="Nom (AR)" {...register('nom_ar')} />
                  <Input label="Prénom (AR)" {...register('prenom_ar')} />
                  {sel('sexe', 'Sexe', [{ value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }])}
                  <Input label="Date de naissance" type="date" {...register('date_naissance')} />
                  <Input label="Lieu de naissance" {...register('lieu_naissance')} />
                  <Input label="Téléphone" type="tel" {...register('telephone')} />
                  <Input label="CIN" {...register('cin')} />
                  <Input label="N° Matricule (DOTI)" {...register('doti')} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <div className="border-b border-gray-100 px-6 py-4">
                <p className="font-semibold text-gray-900">Situation administrative</p>
              </div>
              <CardBody>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Situation administrative" {...register('situation_administrative')} />
                  <Input label="Date de recrutement" type="date" {...register('date_recrutement')} />
                  {sel('grade_id', 'Grade', filteredGrades?.map(g => ({ value: String(g.id), label: g.intitule_fr })) ?? [])}
                  {sel('organizational_unit_id', 'Département', departments.map(u => ({ value: String(u.id), label: u.nom_fr })))}
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
                    <Input label="Spécialité" {...register('specialite')} />
                    <Input label="Date de prise de fonction" type="date" {...register('date_prise_fonction')} />
                    <Input label="Date d'habilitation" type="date" {...register('date_habilitation')} />
                    {sel('laboratoire_id', 'Laboratoire', labos.map(u => ({ value: String(u.id), label: u.nom_fr })))}
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
                    <Input label="Date d'affectation" type="date" {...register('date_affectation')} />
                    {sel('situation_familiale', 'Situation familiale', [
                      { value: 'Célibataire', label: 'Célibataire' },
                      { value: 'Marié(e)', label: 'Marié(e)' },
                      { value: 'Divorcé(e)', label: 'Divorcé(e)' },
                      { value: 'Veuf/Veuve', label: 'Veuf/Veuve' },
                    ])}
                    <Input label="Nombre d'enfants" type="number" min={0} {...register('nombre_enfants')} />
                    <Input label="Ancienneté" placeholder="ex: 5 ans" {...register('anciennete')} />
                    <Input label="Solde congé (jours)" type="number" step={0.5} min={0} {...register('solde_conge')} />
                    <Input label="Congé reporté (jours)" type="number" step={0.5} min={0} {...register('conge_reporte')} />
                  </div>
                </CardBody>
              </Card>
            )}

            <div className="flex justify-end">
              <Button type="submit" loading={isSubmitting}>Enregistrer le profil</Button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
