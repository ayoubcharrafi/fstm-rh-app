'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RoleBadge } from '@/components/ui/Badge';
import type { AccountOverview, StaffProfile } from '@/lib/types';

// ─── Onglets ─────────────────────────────────────────────────────────────────
type TabKey = 'compte' | 'securite' | 'confidentialite' | 'danger';

const TABS: { key: TabKey; label: string; iconPath: string }[] = [
  { key: 'compte',          label: 'Compte',            iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { key: 'securite',        label: 'Sécurité',          iconPath: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  { key: 'confidentialite', label: 'Confidentialité',   iconPath: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
  { key: 'danger',          label: 'Zone sensible',     iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
];

const icon = (d: string, cls = 'h-5 w-5') => (
  <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Jamais';
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

function SectionCard({
  title, description, children, tone = 'default',
}: {
  title: string; description?: string; children: React.ReactNode; tone?: 'default' | 'danger';
}) {
  return (
    <Card className={tone === 'danger' ? 'border-red-200' : undefined}>
      <div className={`border-b px-6 py-4 ${tone === 'danger' ? 'border-red-100 bg-red-50/50' : 'border-gray-100'}`}>
        <p className={`font-semibold ${tone === 'danger' ? 'text-red-800' : 'text-gray-900'}`}>{title}</p>
        {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
      </div>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('compte');

  const { data: overview, isLoading } = useQuery<AccountOverview>({
    queryKey: ['account-overview'],
    queryFn: () => api.get('/account/overview').then(r => r.data),
  });

  const profile = user?.staff_profile ?? null;

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
            <p className="text-sm text-gray-500">
              Gérez votre compte, votre sécurité et vos données personnelles.
            </p>
          </div>

          <div className="mb-6 flex flex-wrap gap-1 border-b border-gray-200">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors
                  ${tab === t.key
                    ? t.key === 'danger'
                      ? 'border-red-600 text-red-600'
                      : 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {icon(t.iconPath, 'h-4 w-4')}
                {t.label}
              </button>
            ))}
          </div>

          {isLoading || !overview ? (
            <div className="space-y-4">
              {[0, 1].map(i => (
                <div key={i} className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
              ))}
            </div>
          ) : (
            <>
              {tab === 'compte' && <AccountTab overview={overview} profile={profile} />}
              {tab === 'securite' && <SecurityTab overview={overview} />}
              {tab === 'confidentialite' && <PrivacyTab overview={overview} />}
              {tab === 'danger' && <DangerTab overview={overview} />}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// ─── Compte ──────────────────────────────────────────────────────────────────
const contactSchema = z.object({
  telephone: z
    .string()
    .max(20, 'Maximum 20 caractères')
    .regex(/^[0-9+\s.-]*$/, 'Chiffres, espaces, + . - uniquement')
    .optional()
    .or(z.literal('')),
});

type ContactForm = z.infer<typeof contactSchema>;

function AccountTab({ overview, profile }: { overview: AccountOverview; profile: StaffProfile | null }) {
  const qc = useQueryClient();

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { telephone: profile?.telephone ?? '' },
  });

  const save = useMutation({
    mutationFn: (values: ContactForm) => api.patch('/profile/contact', { telephone: values.telephone || null }),
    onSuccess: () => {
      toast.success('Coordonnées mises à jour.');
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: e => toast.error(getApiError(e)),
  });

  const fullName = profile?.prenom_fr ? `${profile.prenom_fr} ${profile.nom_fr}` : '—';

  return (
    <div className="space-y-4">
      <SectionCard title="Informations du compte" description="Ces éléments identifient votre compte sur la plateforme.">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow label="Nom complet" value={fullName} />
          <InfoRow label="Adresse e-mail" value={overview.email} />
          <InfoRow label="Rôle" value={<RoleBadge role={overview.role} />} />
          <InfoRow
            label="Statut"
            value={
              overview.is_active
                ? <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Actif</span>
                : <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Désactivé</span>
            }
          />
          <InfoRow label="Compte créé le" value={formatDateTime(overview.created_at)} />
          <InfoRow label="Demandes déposées" value={overview.requests_count} />
        </dl>

        <p className="mt-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Le rôle et les informations administratives (matricule, grade, affectation) sont gérés par
          le service des ressources humaines. Contactez-le pour toute correction.
        </p>
      </SectionCard>

      <EmailCard currentEmail={overview.email} />

      <NotificationsCard enabled={overview.email_notifications} globallyEnabled={overview.email_globally_enabled} />

      <SectionCard title="Coordonnées" description="Le numéro utilisé par l'administration pour vous joindre.">
        <form onSubmit={form.handleSubmit(v => save.mutate(v))} className="space-y-4">
          <div className="max-w-sm">
            <Input label="Téléphone" placeholder="06 12 34 56 78" {...form.register('telephone')} error={form.formState.errors.telephone?.message} />
          </div>
          <Button type="submit" loading={save.isPending}>Enregistrer</Button>
        </form>
      </SectionCard>
    </div>
  );
}

// ─── Adresse e-mail ──────────────────────────────────────────────────────────
const emailSchema = z.object({
  email: z.string().min(1, 'Requis').email('Adresse e-mail invalide').max(255, 'Maximum 255 caractères'),
  current_password: z.string().min(1, 'Mot de passe requis'),
});

type EmailForm = z.infer<typeof emailSchema>;

function EmailCard({ currentEmail }: { currentEmail: string }) {
  const qc = useQueryClient();
  const { refreshUser } = useAuth();

  const form = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: currentEmail, current_password: '' },
  });

  const save = useMutation({
    mutationFn: (values: EmailForm) => api.patch('/account/email', values),
    onSuccess: async (_res, values) => {
      toast.success('Adresse e-mail mise à jour. Utilisez-la pour votre prochaine connexion.');
      // reset() plutôt qu'un simple vidage : la nouvelle adresse devient la
      // valeur de référence du formulaire, et le mot de passe ne reste pas en mémoire.
      form.reset({ email: values.email, current_password: '' });
      qc.invalidateQueries({ queryKey: ['account-overview'] });
      // Le compte vit dans AuthContext, pas dans React Query : sans ceci la
      // barre latérale afficherait encore l'ancienne adresse.
      await refreshUser();
    },
    onError: e => toast.error(getApiError(e)),
  });

  return (
    <SectionCard
      title="Adresse e-mail"
      description="Cette adresse vous sert à vous connecter et à recevoir les notifications."
    >
      <form onSubmit={form.handleSubmit(v => save.mutate(v))} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nouvelle adresse e-mail"
            type="email"
            autoComplete="email"
            {...form.register('email')}
            error={form.formState.errors.email?.message}
          />
          <Input
            label="Mot de passe actuel"
            type="password"
            autoComplete="current-password"
            placeholder="Pour confirmer votre identité"
            {...form.register('current_password')}
            error={form.formState.errors.current_password?.message}
          />
        </div>

        <p className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Après validation, vous devrez utiliser cette nouvelle adresse pour vous connecter.
          Vérifiez qu&apos;elle est correcte et que vous y avez accès.
        </p>

        <Button type="submit" loading={save.isPending}>Modifier l&apos;adresse</Button>
      </form>
    </SectionCard>
  );
}

// ─── Notifications par e-mail ────────────────────────────────────────────────
function NotificationsCard({ enabled, globallyEnabled }: { enabled: boolean; globallyEnabled: boolean }) {
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: (value: boolean) => api.patch('/account/email-notifications', { email_notifications: value }),
    onSuccess: res => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['account-overview'] });
    },
    onError: e => toast.error(getApiError(e)),
  });

  return (
    <SectionCard
      title="Notifications par e-mail"
      description="En complément des notifications affichées dans la plateforme."
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          disabled={save.isPending}
          onChange={e => save.mutate(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-wait"
        />
        <span className="text-sm">
          <span className="font-medium text-gray-900">Recevoir un e-mail pour les événements importants</span>
          <span className="mt-0.5 block text-gray-500">
            Demande validée ou rejetée, document prêt à télécharger, et annonces de l&apos;administration.
          </span>
        </span>
      </label>

      <p className="mt-4 text-xs text-gray-500">
        Les étapes intermédiaires (dépôt, mise en traitement) restent consultables dans la
        cloche de notifications, sans e-mail.
      </p>

      {!globallyEnabled && (
        <p className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          L&apos;envoi d&apos;e-mails est actuellement suspendu par l&apos;administration : aucun
          e-mail ne vous sera adressé, même si l&apos;option ci-dessus est cochée. Vos
          notifications restent visibles dans la cloche.
        </p>
      )}
    </SectionCard>
  );
}

// ─── Sécurité ────────────────────────────────────────────────────────────────
function strengthOf(pwd: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 2) return { score, label: 'Faible', color: 'bg-red-500' };
  if (score === 3) return { score, label: 'Moyen', color: 'bg-orange-500' };
  if (score === 4) return { score, label: 'Bon', color: 'bg-blue-500' };
  return { score, label: 'Excellent', color: 'bg-green-600' };
}

function SecurityTab({ overview }: { overview: AccountOverview }) {
  const { logout } = useAuth();
  const min = overview.password_min;

  const schema = z
    .object({
      current_password: z.string().min(1, 'Mot de passe actuel requis'),
      password: z.string().min(min, `Minimum ${min} caractères`),
      password_confirmation: z.string().min(1, 'Confirmation requise'),
    })
    .refine(d => d.password === d.password_confirmation, {
      message: 'Les mots de passe ne correspondent pas.',
      path: ['password_confirmation'],
    })
    .refine(d => d.password !== d.current_password, {
      message: 'Le nouveau mot de passe doit être différent de l’actuel.',
      path: ['password'],
    });

  type PasswordForm = z.infer<typeof schema>;

  const form = useForm<PasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  });

  // useWatch plutôt que watch() : cette dernière n'est pas mémoïsable
  // et fait renoncer le React Compiler à optimiser la page.
  const newPassword = useWatch({ control: form.control, name: 'password' }) ?? '';
  const strength = strengthOf(newPassword);

  const change = useMutation({
    mutationFn: (values: PasswordForm) => api.post('/account/password', values),
    onSuccess: () => {
      toast.success('Mot de passe mis à jour.');
      form.reset();
    },
    onError: e => toast.error(getApiError(e)),
  });

  return (
    <div className="space-y-4">
      <SectionCard title="Mot de passe" description={`${min} caractères minimum. Le mot de passe actuel est exigé pour confirmer votre identité.`}>
        <form onSubmit={form.handleSubmit(v => change.mutate(v))} className="max-w-sm space-y-4">
          <Input label="Mot de passe actuel" type="password" autoComplete="current-password" {...form.register('current_password')} error={form.formState.errors.current_password?.message} />
          <div>
            <Input label="Nouveau mot de passe" type="password" autoComplete="new-password" {...form.register('password')} error={form.formState.errors.password?.message} />
            {newPassword.length > 0 && (
              <div className="mt-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: `${(strength.score / 5) * 100}%` }} />
                </div>
                <p className="mt-1 text-xs text-gray-500">Robustesse : {strength.label}</p>
              </div>
            )}
          </div>
          <Input label="Confirmer le nouveau mot de passe" type="password" autoComplete="new-password" {...form.register('password_confirmation')} error={form.formState.errors.password_confirmation?.message} />
          <Button type="submit" loading={change.isPending}>Modifier le mot de passe</Button>
        </form>

        <ul className="mt-5 space-y-1 text-xs text-gray-500">
          <li>• Mélangez majuscules, minuscules, chiffres et symboles.</li>
          <li>• N&apos;utilisez pas un mot de passe déjà employé sur un autre service.</li>
          <li>• Ne le communiquez jamais, y compris au service RH.</li>
        </ul>
      </SectionCard>

      <SectionCard title="Session active" description="Cet appareil est actuellement connecté à votre compte.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow label="Dernière connexion" value={formatDateTime(overview.last_login_at)} />
            <InfoRow
              label="Appareil"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Session en cours
                </span>
              }
            />
          </dl>
          <Button variant="secondary" onClick={() => logout()}>Se déconnecter</Button>
        </div>

        <p className="mt-5 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Si vous ne reconnaissez pas la dernière connexion, changez immédiatement votre mot de
          passe et prévenez le service RH.
        </p>
      </SectionCard>
    </div>
  );
}

// ─── Confidentialité & données ───────────────────────────────────────────────
function PrivacyTab({ overview }: { overview: AccountOverview }) {
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      const res = await api.get('/account/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mes-donnees.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export téléchargé.');
    } catch (e) {
      toast.error(getApiError(e));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Vos données" description="Ce que la plateforme conserve à votre sujet.">
        <ul className="space-y-3 text-sm text-gray-700">
          <li className="flex gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            <span><strong>Identité et dossier administratif</strong> — état civil, matricule, grade et affectation, saisis et tenus à jour par le service RH.</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            <span><strong>Demandes de documents</strong> — {overview.requests_count} demande(s) et les pièces jointes qui les accompagnent.</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            <span><strong>Journal d&apos;activité</strong> — connexions et actions sur votre compte, conservées à des fins de traçabilité.</span>
          </li>
        </ul>
      </SectionCard>

      <SectionCard title="Exporter mes données" description="Téléchargez une copie de votre dossier et de vos demandes au format JSON.">
        <Button variant="secondary" loading={exporting} onClick={exportData}>
          Télécharger mes données
        </Button>
        <p className="mt-3 text-xs text-gray-500">
          Le fichier contient des informations personnelles : conservez-le en lieu sûr.
        </p>
      </SectionCard>

      <SectionCard title="Visibilité" description="Qui accède à vos informations.">
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• Le service des ressources humaines consulte votre dossier pour traiter vos demandes.</li>
          <li>• Aucun autre agent n&apos;a accès à votre profil ni à vos demandes.</li>
          <li>• Vos données ne sont transmises à aucun tiers extérieur à l&apos;établissement.</li>
        </ul>
      </SectionCard>
    </div>
  );
}

// ─── Zone sensible ───────────────────────────────────────────────────────────
const deletionSchema = z.object({
  motif: z.string().min(10, 'Décrivez votre motif (10 caractères minimum)').max(1000, 'Maximum 1000 caractères'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type DeletionForm = z.infer<typeof deletionSchema>;

function DangerTab({ overview }: { overview: AccountOverview }) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const pending = overview.deletion_request;

  const form = useForm<DeletionForm>({
    resolver: zodResolver(deletionSchema),
    defaultValues: { motif: '', password: '' },
  });

  const submit = useMutation({
    mutationFn: (values: DeletionForm) => api.post('/account/deletion-request', values),
    onSuccess: () => {
      toast.success('Demande transmise à l’administration.');
      form.reset();
      setConfirming(false);
      qc.invalidateQueries({ queryKey: ['account-overview'] });
    },
    onError: e => toast.error(getApiError(e)),
  });

  const cancel = useMutation({
    mutationFn: () => api.delete('/account/deletion-request'),
    onSuccess: () => {
      toast.success('Demande annulée.');
      qc.invalidateQueries({ queryKey: ['account-overview'] });
    },
    onError: e => toast.error(getApiError(e)),
  });

  if (pending) {
    return (
      <SectionCard tone="danger" title="Demande de suppression en cours" description="Votre demande a été transmise au service des ressources humaines.">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow label="Déposée le" value={formatDateTime(pending.created_at)} />
          <InfoRow
            label="Statut"
            value={<span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">En attente de décision</span>}
          />
        </dl>
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide text-gray-400">Motif transmis</p>
          <p className="mt-1 whitespace-pre-line rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            {pending.motif}
          </p>
        </div>
        <div className="mt-5">
          <Button variant="secondary" loading={cancel.isPending} onClick={() => cancel.mutate()}>
            Annuler ma demande
          </Button>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard tone="danger" title="Supprimer mon compte" description="Cette action met fin à votre accès à la plateforme.">
      <div className="space-y-3 text-sm text-gray-700">
        <p>
          La suppression n&apos;est pas immédiate : votre demande est examinée par le service des
          ressources humaines, qui l&apos;approuve ou la refuse en vous répondant.
        </p>
        <ul className="space-y-1 text-sm">
          <li>• Votre accès à la plateforme sera fermé après approbation.</li>
          <li>• Votre dossier RH et vos demandes traitées sont conservés par l&apos;établissement, comme l&apos;exige la réglementation.</li>
          <li>• Vous pouvez annuler votre demande tant qu&apos;elle n&apos;a pas été traitée.</li>
        </ul>
      </div>

      {!confirming ? (
        <div className="mt-5">
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Demander la suppression de mon compte
          </Button>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(v => submit.mutate(v))} className="mt-5 space-y-4 rounded-lg border border-red-200 bg-red-50/40 p-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-800">
              Motif de la demande
            </label>
            <textarea
              rows={4}
              placeholder="Expliquez pourquoi vous souhaitez supprimer votre compte (départ de l'établissement, doublon...)"
              {...form.register('motif')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
            {form.formState.errors.motif && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.motif.message}</p>
            )}
          </div>

          <div className="max-w-sm">
            <Input
              label="Confirmez avec votre mot de passe"
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
              error={form.formState.errors.password?.message}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="danger" loading={submit.isPending}>
              Envoyer la demande
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setConfirming(false); form.reset(); }}>
              Annuler
            </Button>
          </div>
        </form>
      )}
    </SectionCard>
  );
}
