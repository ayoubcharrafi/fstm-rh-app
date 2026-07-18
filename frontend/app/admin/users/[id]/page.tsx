'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RoleBadge } from '@/components/ui/Badge';
import type { Grade, OrganizationalUnit, User } from '@/lib/types';

type ProfileForm = Record<string, string>;

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['admin-user', id],
    queryFn: () => api.get(`/admin/users/${id}`).then(r => r.data),
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
  const staffType = profile?.staff_type ?? (user?.role === 'PROFESSEUR' ? 'PROFESSEUR' : 'EMPLOYE');

  useEffect(() => {
    if (!profile) return;
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
      // Employé extras
      date_affectation:         profile.employee_profile?.date_affectation ?? '',
      fonction_actuelle:        profile.employee_profile?.fonction_actuelle ?? '',
      situation_familiale:      profile.employee_profile?.situation_familiale ?? '',
      nombre_enfants:           String(profile.employee_profile?.nombre_enfants ?? '0'),
      anciennete:               profile.employee_profile?.anciennete ?? '',
      solde_conge:              String(profile.employee_profile?.solde_conge ?? '0'),
      conge_reporte:            String(profile.employee_profile?.conge_reporte ?? '0'),
      // Professeur extras
      specialite:               profile.professor_profile?.specialite ?? '',
      date_prise_fonction:      profile.professor_profile?.date_prise_fonction ?? '',
      date_habilitation:        profile.professor_profile?.date_habilitation ?? '',
      laboratoire_id:           String(profile.professor_profile?.laboratoire_id ?? ''),
    });
  }, [profile, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: ProfileForm) => {
      if (profile) return api.patch(`/admin/users/${id}/profile`, data);
      return api.post(`/admin/users/${id}/profile`, { ...data, staff_type: staffType });
    },
    onSuccess: () => {
      toast.success('Profil sauvegardé.');
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  const toggleMutation = useMutation({
    mutationFn: () => api.patch(`/admin/users/${id}/status`, { is_active: !user?.is_active }),
    onSuccess: () => { toast.success('Statut mis à jour.'); qc.invalidateQueries({ queryKey: ['admin-user', id] }); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/admin/users/${id}`),
    onSuccess: () => { toast.success('Utilisateur supprimé.'); router.push('/admin/users'); },
    onError: (e) => toast.error(getApiError(e)),
  });

  if (isLoading) return <AppShell><div className="p-8 text-sm text-gray-400">Chargement…</div></AppShell>;
  if (!user) return <AppShell><div className="p-8 text-sm text-red-500">Utilisateur introuvable.</div></AppShell>;

  // Flatten org units for selects
  const flatUnits: OrganizationalUnit[] = [];
  units?.forEach(u => { flatUnits.push(u); u.children?.forEach(c => flatUnits.push(c)); });
  const departments  = flatUnits.filter(u => u.type === 'DEPARTEMENT');
  const labos        = flatUnits.filter(u => u.type === 'LABORATOIRE');
  const filteredGrades = grades?.filter(g => !g.staff_type || g.staff_type === staffType);

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
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {profile ? `${profile.prenom_fr} ${profile.nom_fr}` : user.email}
              </h1>
              {profile?.nom_ar && <p className="text-sm text-gray-400" dir="rtl">{profile.prenom_ar} {profile.nom_ar}</p>}
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
            <RoleBadge role={user.role} />
            <button
              onClick={() => toggleMutation.mutate()}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors
                ${user.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
            >
              {user.is_active ? 'Actif' : 'Inactif'}
            </button>
          </div>
          <Button
            variant="danger" size="sm"
            loading={deleteMutation.isPending}
            onClick={() => { if (confirm('Supprimer cet utilisateur ?')) deleteMutation.mutate(); }}
          >
            Supprimer
          </Button>
        </div>

        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="flex flex-col gap-6" autoComplete="off">
          {/* Identité commune */}
          <Card>
            <div className="border-b border-gray-100 px-6 py-4">
              <p className="font-semibold text-gray-900">Identité</p>
            </div>
            <CardBody>
              <div className="grid grid-cols-2 gap-4">
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

          {/* Situation administrative commune */}
          <Card>
            <div className="border-b border-gray-100 px-6 py-4">
              <p className="font-semibold text-gray-900">Situation administrative</p>
            </div>
            <CardBody>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Situation administrative" {...register('situation_administrative')} />
                <Input label="Date de recrutement" type="date" {...register('date_recrutement')} />
                {sel('grade_id', 'Grade', filteredGrades?.map(g => ({ value: String(g.id), label: g.intitule_fr })) ?? [])}
                {sel('organizational_unit_id', 'Département', departments.map(u => ({ value: String(u.id), label: u.nom_fr })))}
              </div>
            </CardBody>
          </Card>

          {/* Profil PROFESSEUR */}
          {staffType === 'PROFESSEUR' && (
            <Card>
              <div className="border-b border-gray-100 px-6 py-4">
                <p className="font-semibold text-gray-900">Profil Professeur</p>
              </div>
              <CardBody>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Spécialité" {...register('specialite')} />
                  <Input label="Date de prise de fonction" type="date" {...register('date_prise_fonction')} />
                  <Input label="Date d'habilitation" type="date" {...register('date_habilitation')} />
                  {sel('laboratoire_id', 'Laboratoire', labos.map(u => ({ value: String(u.id), label: u.nom_fr })))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Profil EMPLOYÉ */}
          {staffType === 'EMPLOYE' && (
            <Card>
              <div className="border-b border-gray-100 px-6 py-4">
                <p className="font-semibold text-gray-900">Profil Employé</p>
              </div>
              <CardBody>
                <div className="grid grid-cols-2 gap-4">
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
      </div>
    </AppShell>
  );
}
