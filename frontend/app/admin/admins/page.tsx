'use client';

import { useEffect, useState } from 'react';
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
import { Avatar, ROLE_AVATAR, initialsOf } from '@/components/ui/Avatar';
import type { Paginated, User } from '@/lib/types';

// ── Création ────────────────────────────────────────────────────────────────
const createSchema = z.object({
  email:      z.string().email('Email invalide'),
  password:   z.string().min(8, 'Minimum 8 caractères'),
  nom_fr:     z.string().min(1, 'Requis'),
  prenom_fr:  z.string().min(1, 'Requis'),
  telephone:  z.string().optional(),
  fonction:   z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

// ── Édition ─────────────────────────────────────────────────────────────────
const editSchema = z.object({
  email:     z.string().email('Email invalide'),
  nom_fr:    z.string().min(1, 'Requis'),
  prenom_fr: z.string().min(1, 'Requis'),
  telephone: z.string().optional(),
  fonction:  z.string().optional(),
  password:  z.string().min(8).optional().or(z.literal('')),
});
type EditForm = z.infer<typeof editSchema>;

export default function AdminAdminsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState<User | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<Paginated<User>>({
    queryKey: ['admin-admins'],
    queryFn:  () => api.get('/admin/users', { params: { role: 'ADMIN' } }).then(r => r.data),
  });
  const admins = data?.data.filter(u => u.role === 'ADMIN') ?? [];

  // ── Create form ──────────────────────────────────────────────────────────
  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  const createMutation = useMutation({
    mutationFn: async (d: CreateForm) => {
      const res = await api.post('/admin/users', { email: d.email, password: d.password, role: 'ADMIN' });
      const uid = res.data.id;
      // staff_type est redéduit du rôle côté serveur : un administrateur reçoit
      // le type ADMIN, sans dossier RH ni sous-profil employé.
      await api.post(`/admin/users/${uid}/profile`, {
        staff_type: 'ADMIN',
        nom_fr:     d.nom_fr,
        prenom_fr:  d.prenom_fr,
        telephone:  d.telephone || undefined,
        fonction:   d.fonction  || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Administrateur créé.');
      qc.invalidateQueries({ queryKey: ['admin-admins'] });
      createForm.reset(); setShowCreate(false);
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  // ── Edit form ────────────────────────────────────────────────────────────
  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) });

  useEffect(() => {
    if (!editing) return;
    const p = editing.staff_profile;
    editForm.reset({
      email:     editing?.email ?? '',
      nom_fr:    p?.nom_fr    ?? '',
      prenom_fr: p?.prenom_fr ?? '',
      telephone: p?.telephone ?? '',
      fonction:  p?.fonction  ?? '',
      password:  '',
    });
  }, [editing, editForm]);

  const editMutation = useMutation({
    mutationFn: async (d: EditForm) => {
      if (!editing) return;
      // Compte : e-mail (seulement s'il change, sinon la règle unique le rejette)
      // et mot de passe, en un seul appel.
      const compte: Record<string, string> = {};
      if (d.email !== editing.email) compte.email = d.email;
      if (d.password)                compte.password = d.password;
      if (Object.keys(compte).length) {
        await api.patch(`/admin/users/${editing.id}`, compte);
      }
      // Update or create profile
      const champs = {
        nom_fr:    d.nom_fr,
        prenom_fr: d.prenom_fr,
        telephone: d.telephone || undefined,
        fonction:  d.fonction  || undefined,
      };
      const profileAction = editing.staff_profile
        ? api.patch(`/admin/users/${editing.id}/profile`, champs)
        : api.post(`/admin/users/${editing.id}/profile`, { staff_type: 'ADMIN', ...champs });
      await profileAction;
    },
    onSuccess: () => {
      toast.success('Profil mis à jour.');
      qc.invalidateQueries({ queryKey: ['admin-admins'] });
      setEditing(null);
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  // ── Toggle / Delete ───────────────────────────────────────────────────────
  const toggleStatus = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.patch(`/admin/users/${id}/status`, { is_active }),
    onSuccess: () => { toast.success('Statut mis à jour.'); qc.invalidateQueries({ queryKey: ['admin-admins'] }); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: () => { toast.success('Administrateur supprimé.'); qc.invalidateQueries({ queryKey: ['admin-admins'] }); },
    onError: (e) => toast.error(getApiError(e)),
  });

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Administrateurs</h1>
            <p className="text-sm text-gray-500">Gestionnaires ayant accès à l&apos;espace d&apos;administration</p>
          </div>
          <Button onClick={() => { setShowCreate(v => !v); setEditing(null); }}>
            {showCreate ? 'Annuler' : '+ Nouvel administrateur'}
          </Button>
        </div>

        {/* ── Formulaire création ── */}
        {showCreate && (
          <Card className="mb-6 max-w-2xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <p className="font-semibold text-gray-900">Nouvel administrateur</p>
            </div>
            <CardBody>
              <form onSubmit={createForm.handleSubmit(d => createMutation.mutate(d))} autoComplete="off" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Nom *"    error={createForm.formState.errors.nom_fr?.message}    {...createForm.register('nom_fr')} />
                <Input label="Prénom *" error={createForm.formState.errors.prenom_fr?.message} {...createForm.register('prenom_fr')} />
                <Input label="Téléphone" type="tel" autoComplete="off" {...createForm.register('telephone')} />
                <Input label="Fonction / Poste" placeholder="ex: Chef du service RH" {...createForm.register('fonction')} />
                <Input label="Email *" type="email" autoComplete="off" error={createForm.formState.errors.email?.message} {...createForm.register('email')} />
                <Input label="Mot de passe *" type="password" autoComplete="new-password" error={createForm.formState.errors.password?.message} {...createForm.register('password')} />
                <div className="col-span-2 flex gap-3 pt-2">
                  <Button type="submit" loading={createMutation.isPending}>Créer</Button>
                  <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Annuler</Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}

        {/* ── Formulaire édition ── */}
        {editing && (
          <Card className="mb-6 max-w-2xl border-blue-200">
            <div className="border-b border-blue-100 bg-blue-50 px-6 py-4">
              <p className="font-semibold text-blue-800">Modifier : {editing.email}</p>
            </div>
            <CardBody>
              <form onSubmit={editForm.handleSubmit(d => editMutation.mutate(d))} autoComplete="off" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Adresse e-mail *"
                  type="email"
                  autoComplete="off"
                  className="col-span-2"
                  error={editForm.formState.errors.email?.message}
                  {...editForm.register('email')}
                />
                <Input label="Nom *"    error={editForm.formState.errors.nom_fr?.message}    {...editForm.register('nom_fr')} />
                <Input label="Prénom *" error={editForm.formState.errors.prenom_fr?.message} {...editForm.register('prenom_fr')} />
                <Input label="Téléphone" type="tel" autoComplete="off" {...editForm.register('telephone')} />
                <Input label="Fonction / Poste" {...editForm.register('fonction')} />
                <Input
                  label="Nouveau mot de passe (laisser vide pour ne pas changer)"
                  type="password"
                  autoComplete="new-password"
                  className="col-span-2"
                  error={editForm.formState.errors.password?.message}
                  {...editForm.register('password')}
                />
                {editForm.watch('email') !== editing.email && (
                  <p className="col-span-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    L&apos;adresse de connexion de ce compte va changer. Prévenez son
                    titulaire : l&apos;ancienne adresse ne permettra plus de se connecter.
                  </p>
                )}
                <div className="col-span-2 flex gap-3 pt-2">
                  <Button type="submit" loading={editMutation.isPending}>Enregistrer</Button>
                  <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Annuler</Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}

        {/* ── Liste ── */}
        <Card>
          <CardBody className="p-0">
            {isLoading ? (
              <p className="px-6 py-10 text-center text-sm text-gray-400">Chargement…</p>
            ) : !admins.length ? (
              <p className="px-6 py-10 text-center text-sm text-gray-400">Aucun administrateur.</p>
            ) : (
              <div className="overflow-x-auto">
                {/* Sur écran étroit les colonnes défilent au lieu de déborder de la carte. */}
                <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    <th className="whitespace-nowrap px-6 py-3">Nom &amp; Prénom</th>
                    <th className="whitespace-nowrap px-6 py-3">Email</th>
                    <th className="whitespace-nowrap px-6 py-3">Téléphone</th>
                    <th className="whitespace-nowrap px-6 py-3">Fonction</th>
                    <th className="whitespace-nowrap px-6 py-3">Statut</th>
                    <th className="whitespace-nowrap px-6 py-3">Dernière connexion</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(u => {
                    const p = u.staff_profile;
                    return (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">
                          <div className="flex items-center gap-3">
                            <Avatar
                              photoUrl={p?.photo_url}
                              initials={initialsOf(u)}
                              size="sm"
                              className={`h-9 w-9 shrink-0 text-xs ${p?.photo_url ? '' : ROLE_AVATAR.ADMIN}`}
                            />
                            {p
                              ? <span className="whitespace-nowrap">{p.prenom_fr} {p.nom_fr}</span>
                              : <span className="italic text-gray-400">—</span>}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-gray-600">{u.email}</td>
                        <td className="px-6 py-3 text-gray-600">{p?.telephone ?? '—'}</td>
                        <td className="px-6 py-3 text-xs text-gray-600">{p?.fonction ?? '—'}</td>
                        <td className="px-6 py-3">
                          <button
                            onClick={() => toggleStatus.mutate({ id: u.id, is_active: !u.is_active })}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors
                              ${u.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                          >
                            {u.is_active ? 'Actif' : 'Inactif'}
                          </button>
                        </td>
                        <td className="px-6 py-3 text-xs text-gray-400">
                          {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('fr-FR') : 'Jamais'}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex gap-3 whitespace-nowrap">
                            <button
                              onClick={() => { setEditing(u); setShowCreate(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => { if (confirm('Supprimer cet administrateur ?')) deleteMutation.mutate(u.id); }}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
