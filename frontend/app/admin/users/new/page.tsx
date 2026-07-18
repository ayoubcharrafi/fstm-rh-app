'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Grade, OrganizationalUnit } from '@/lib/types';

const schema = z.object({
  // Compte
  email:    z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  role:     z.enum(['PROFESSEUR', 'EMPLOYE']),
  // Identité commune
  nom_fr:                   z.string().min(1, 'Requis'),
  prenom_fr:                z.string().min(1, 'Requis'),
  nom_ar:                   z.string().optional(),
  prenom_ar:                z.string().optional(),
  sexe:                     z.enum(['M', 'F', '']).optional(),
  date_naissance:           z.string().optional(),
  lieu_naissance:           z.string().optional(),
  telephone:                z.string().optional(),
  cin:                      z.string().optional(),
  doti:                     z.string().optional(),
  // Situation administrative
  situation_administrative: z.string().optional(),
  date_recrutement:         z.string().optional(),
  grade_id:                 z.string().optional(),
  organizational_unit_id:   z.string().optional(),
  // Employé
  date_affectation:         z.string().optional(),
  fonction_actuelle:        z.string().optional(),
  situation_familiale:      z.string().optional(),
  nombre_enfants:           z.string().optional(),
  anciennete:               z.string().optional(),
  solde_conge:              z.string().optional(),
  conge_reporte:            z.string().optional(),
  // Professeur
  specialite:               z.string().optional(),
  date_prise_fonction:      z.string().optional(),
  date_habilitation:        z.string().optional(),
  laboratoire_id:           z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewUserPage() {
  const router = useRouter();
  const [role, setRole] = useState<'PROFESSEUR' | 'EMPLOYE'>('PROFESSEUR');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'PROFESSEUR' },
  });

  const { data: grades } = useQuery<Grade[]>({
    queryKey: ['grades'],
    queryFn: () => api.get('/grades').then(r => r.data),
  });

  const { data: units } = useQuery<OrganizationalUnit[]>({
    queryKey: ['org-units'],
    queryFn: () => api.get('/organizational-units').then(r => r.data),
  });

  const flatUnits: OrganizationalUnit[] = [];
  units?.forEach(u => { flatUnits.push(u); u.children?.forEach(c => flatUnits.push(c)); });
  const departments = flatUnits.filter(u => u.type === 'DEPARTEMENT');
  const labos       = flatUnits.filter(u => u.type === 'LABORATOIRE');
  const filteredGrades = grades?.filter(g => !g.staff_type || g.staff_type === role) ?? [];

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // 1. Create user account
      const userRes = await api.post('/admin/users', {
        email:    data.email,
        password: data.password,
        role:     data.role,
      });
      const userId = userRes.data.id;

      // 2. Create staff profile
      await api.post(`/admin/users/${userId}/profile`, {
        staff_type:               data.role,
        nom_fr:                   data.nom_fr,
        prenom_fr:                data.prenom_fr,
        nom_ar:                   data.nom_ar || undefined,
        prenom_ar:                data.prenom_ar || undefined,
        sexe:                     data.sexe || undefined,
        date_naissance:           data.date_naissance || undefined,
        lieu_naissance:           data.lieu_naissance || undefined,
        telephone:                data.telephone || undefined,
        cin:                      data.cin  || undefined,
        doti:                     data.doti || undefined,
        situation_administrative: data.situation_administrative || undefined,
        date_recrutement:         data.date_recrutement || undefined,
        grade_id:                 data.grade_id || undefined,
        organizational_unit_id:   data.organizational_unit_id || undefined,
        // Role-specific
        ...(data.role === 'EMPLOYE' ? {
          date_affectation:    data.date_affectation || undefined,
          fonction_actuelle:   data.fonction_actuelle || undefined,
          situation_familiale: data.situation_familiale || undefined,
          nombre_enfants:      data.nombre_enfants || undefined,
          anciennete:          data.anciennete || undefined,
          solde_conge:         data.solde_conge || undefined,
          conge_reporte:       data.conge_reporte || undefined,
        } : {
          specialite:          data.specialite || undefined,
          date_prise_fonction: data.date_prise_fonction || undefined,
          date_habilitation:   data.date_habilitation || undefined,
          laboratoire_id:      data.laboratoire_id || undefined,
        }),
      });

      return userId;
    },
    onSuccess: (userId) => {
      toast.success('Utilisateur créé avec succès.');
      router.push(`/admin/users/${userId}`);
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  const sel = (name: keyof FormData, label: string, options: { value: string; label: string }[]) => (
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
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">← Retour</button>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau membre du personnel</h1>
        </div>

        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} autoComplete="off" className="flex flex-col gap-6 max-w-3xl">

          {/* Compte */}
          <Card>
            <div className="border-b border-gray-100 px-6 py-4">
              <p className="font-semibold text-gray-900">Compte d'accès</p>
            </div>
            <CardBody>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Email *" type="email" autoComplete="off" error={errors.email?.message} {...register('email')} />
                <Input label="Mot de passe *" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Type de personnel *</label>
                  <div className="flex gap-3">
                    {(['PROFESSEUR', 'EMPLOYE'] as const).map(r => (
                      <label key={r} className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          value={r}
                          {...register('role')}
                          onChange={() => setRole(r)}
                          defaultChecked={r === 'PROFESSEUR'}
                          className="accent-blue-600"
                        />
                        <span className="text-sm text-gray-700">{r === 'PROFESSEUR' ? 'Professeur' : 'Employé'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Identité */}
          <Card>
            <div className="border-b border-gray-100 px-6 py-4">
              <p className="font-semibold text-gray-900">Identité</p>
            </div>
            <CardBody>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nom (français) *" error={errors.nom_fr?.message} {...register('nom_fr')} />
                <Input label="Prénom (français) *" error={errors.prenom_fr?.message} {...register('prenom_fr')} />
                <Input label="Nom (arabe)" {...register('nom_ar')} />
                <Input label="Prénom (arabe)" {...register('prenom_ar')} />
                {sel('sexe', 'Sexe', [{ value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }])}
                <Input label="Date de naissance" type="date" {...register('date_naissance')} />
                <Input label="Lieu de naissance" {...register('lieu_naissance')} />
                <Input label="Téléphone" type="tel" {...register('telephone')} />
                <Input label="CIN" {...register('cin')} />
                <Input label="N° Matricule (DOTI)" {...register('doti')} />
              </div>
            </CardBody>
          </Card>

          {/* Situation administrative */}
          <Card>
            <div className="border-b border-gray-100 px-6 py-4">
              <p className="font-semibold text-gray-900">Situation administrative</p>
            </div>
            <CardBody>
              <div className="grid grid-cols-2 gap-4">
                {sel('situation_administrative', 'Situation administrative', [
                  { value: 'En activité', label: 'En activité' },
                  { value: 'Détaché', label: 'Détaché' },
                  { value: 'Disponibilité', label: 'Disponibilité' },
                  { value: 'Retraité', label: 'Retraité' },
                ])}
                <Input label="Date de recrutement" type="date" {...register('date_recrutement')} />
                {sel('grade_id', 'Grade', filteredGrades.map(g => ({ value: String(g.id), label: g.intitule_fr })))}
                {sel('organizational_unit_id', 'Département', departments.map(u => ({ value: String(u.id), label: u.nom_fr })))}
              </div>
            </CardBody>
          </Card>

          {/* Spécifique Professeur */}
          {role === 'PROFESSEUR' && (
            <Card>
              <div className="border-b border-gray-100 px-6 py-4">
                <p className="font-semibold text-gray-900">Informations professeur</p>
              </div>
              <CardBody>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Spécialité" {...register('specialite')} />
                  <Input label="Date de prise de fonction" type="date" {...register('date_prise_fonction')} />
                  <Input label="Date d'habilitation" type="date" {...register('date_habilitation')} />
                  {sel('laboratoire_id', 'Laboratoire (optionnel)', labos.map(u => ({ value: String(u.id), label: u.nom_fr })))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Spécifique Employé */}
          {role === 'EMPLOYE' && (
            <Card>
              <div className="border-b border-gray-100 px-6 py-4">
                <p className="font-semibold text-gray-900">Informations employé</p>
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
                  <Input label="Solde congé (jours)" type="number" step={0.5} {...register('solde_conge')} />
                  <Input label="Congé reporté (jours)" type="number" step={0.5} {...register('conge_reporte')} />
                </div>
              </CardBody>
            </Card>
          )}

          <div className="flex gap-3">
            <Button type="submit" loading={isSubmitting}>Créer le membre</Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>Annuler</Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
