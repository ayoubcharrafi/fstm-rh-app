'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// ─── Types ───────────────────────────────────────────────────────────────────
interface SettingsMap {
  'requests.stale_threshold_hours': number;
  'security.login_max_attempts': number;
  'security.login_decay_seconds': number;
  'security.password_min_length': number;
  'security.jwt_ttl_minutes': number;
  'logs.audit_retention_days': number;
}

interface SystemInfo {
  php_version: string;
  laravel_version: string;
  users: number;
  requests: number;
  audit_logs: number;
  notifications_read: number;
  notifications_unread: number;
}

interface SettingsResponse {
  settings: SettingsMap;
  system: SystemInfo;
}

type TabKey = 'compte' | 'securite' | 'demandes' | 'logs';

const TABS: { key: TabKey; label: string; iconPath: string }[] = [
  { key: 'compte',   label: 'Mon compte',          iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { key: 'securite', label: 'Sécurité plateforme', iconPath: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  { key: 'demandes', label: 'Demandes',            iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { key: 'logs',     label: 'Logs & maintenance',  iconPath: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
];

const icon = (d: string, cls = 'h-5 w-5') => (
  <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrateur',
  PROFESSEUR: 'Professeur',
  EMPLOYE: 'Employé',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Jamais';
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

// A labelled numeric field with an inline helper description.
function NumberField({
  label, help, unit, value, min, max, onChange,
}: {
  label: string; help: string; unit?: string; value: number; min: number; max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-800">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : ''}
          onChange={e => onChange(parseInt(e.target.value, 10))}
          className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      <p className="text-xs text-gray-500">{help}</p>
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="border-b border-gray-100 px-6 py-4">
        <p className="font-semibold text-gray-900">{title}</p>
        {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
      </div>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('compte');

  const { data, isLoading } = useQuery<SettingsResponse>({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/admin/settings').then(r => r.data),
  });

  return (
    <AppShell>
      <div className="p-8">
        <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-sm text-gray-500">
            Configuration de la plateforme, sécurité et maintenance.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-1 border-b border-gray-200">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors
                ${tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {icon(t.iconPath, 'h-4 w-4')}
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[0, 1].map(i => (
              <div key={i} className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
            ))}
          </div>
        ) : (
          <div>
            {tab === 'compte'   && <AccountTab lastLogin={user?.last_login_at ?? null} email={user?.email ?? ''} role={user?.role ?? ''} sessionMinutes={data?.settings['security.jwt_ttl_minutes'] ?? 60} />}
            {tab === 'securite' && <SecurityTab settings={data!.settings} />}
            {tab === 'demandes' && <RequestsTab settings={data!.settings} />}
            {tab === 'logs'     && <LogsTab settings={data!.settings} system={data!.system} onPurged={() => qc.invalidateQueries({ queryKey: ['admin-settings'] })} />}
          </div>
        )}
        </div>
      </div>
    </AppShell>
  );
}

// ─── Mon compte ──────────────────────────────────────────────────────────────
function AccountTab({ email, role, lastLogin, sessionMinutes }: { email: string; role: string; lastLogin: string | null; sessionMinutes: number }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const changePassword = useMutation({
    mutationFn: () =>
      api.post('/account/password', {
        current_password: current,
        password: next,
        password_confirmation: confirm,
      }),
    onSuccess: () => {
      toast.success('Mot de passe mis à jour.');
      setCurrent(''); setNext(''); setConfirm('');
    },
    onError: e => toast.error(getApiError(e)),
  });

  const canSubmit = current && next && confirm && next === confirm;

  return (
    <div className="space-y-4">
      <SectionCard title="Informations du compte">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">Adresse e-mail</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">Rôle</dt>
            <dd className="mt-1">
              <span className="inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                {ROLE_LABEL[role] ?? role}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">Dernière connexion</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{formatDateTime(lastLogin)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">Durée de session</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">
              {sessionMinutes} min <span className="font-normal text-gray-400">(configurable · onglet Sécurité)</span>
            </dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Changer le mot de passe" description="Saisissez votre mot de passe actuel pour confirmer.">
        <form
          className="space-y-4"
          autoComplete="off"
          onSubmit={e => { e.preventDefault(); if (canSubmit) changePassword.mutate(); }}
        >
          <Input
            label="Mot de passe actuel"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={e => setCurrent(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={e => setNext(e.target.value)}
            />
            <Input
              label="Confirmer le mot de passe"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              error={confirm && next !== confirm ? 'Les mots de passe ne correspondent pas.' : undefined}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={changePassword.isPending} disabled={!canSubmit}>
              Mettre à jour
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

// ─── Settings save hook (shared by Security & Requests) ──────────────────────
function useSettingsForm(initial: SettingsMap) {
  const qc = useQueryClient();
  const [form, setForm] = useState<SettingsMap>(initial);

  useEffect(() => { setForm(initial); }, [initial]);

  const mutation = useMutation({
    mutationFn: (payload: Partial<Record<string, number>>) => api.put('/admin/settings', payload),
    onSuccess: () => {
      toast.success('Paramètres enregistrés.');
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: e => toast.error(getApiError(e)),
  });

  const set = (key: keyof SettingsMap, value: number) =>
    setForm(f => ({ ...f, [key]: value }));

  return { form, set, mutation };
}

// snake payload keys expected by the API (dots → underscores)
function payloadKey(key: keyof SettingsMap): string {
  return key.replace(/\./g, '_');
}

// ─── Sécurité plateforme ─────────────────────────────────────────────────────
function SecurityTab({ settings }: { settings: SettingsMap }) {
  const { form, set, mutation } = useSettingsForm(settings);

  const save = () => {
    const keys: (keyof SettingsMap)[] = [
      'security.login_max_attempts',
      'security.login_decay_seconds',
      'security.password_min_length',
      'security.jwt_ttl_minutes',
    ];
    const payload: Record<string, number> = {};
    keys.forEach(k => { payload[payloadKey(k)] = form[k]; });
    mutation.mutate(payload);
  };

  return (
    <SectionCard
      title="Sécurité de la plateforme"
      description="Ces réglages sont appliqués immédiatement à toute la plateforme."
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <NumberField
          label="Tentatives de connexion max"
          help="Nombre d'essais avant blocage temporaire d'une adresse IP."
          unit="essais"
          min={1} max={20}
          value={form['security.login_max_attempts']}
          onChange={v => set('security.login_max_attempts', v)}
        />
        <NumberField
          label="Durée de blocage"
          help="Temps d'attente après avoir dépassé le nombre de tentatives."
          unit="secondes"
          min={10} max={3600}
          value={form['security.login_decay_seconds']}
          onChange={v => set('security.login_decay_seconds', v)}
        />
        <NumberField
          label="Longueur minimale du mot de passe"
          help="Appliquée à la création de compte et au changement de mot de passe."
          unit="caractères"
          min={6} max={64}
          value={form['security.password_min_length']}
          onChange={v => set('security.password_min_length', v)}
        />
        <NumberField
          label="Durée de session"
          help="Délai avant expiration du jeton de connexion (déconnexion automatique)."
          unit="minutes"
          min={15} max={43200}
          value={form['security.jwt_ttl_minutes']}
          onChange={v => set('security.jwt_ttl_minutes', v)}
        />
      </div>
      <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
        <Button onClick={save} loading={mutation.isPending}>Enregistrer</Button>
      </div>
    </SectionCard>
  );
}

// ─── Demandes ────────────────────────────────────────────────────────────────
function RequestsTab({ settings }: { settings: SettingsMap }) {
  const { form, set, mutation } = useSettingsForm(settings);

  const save = () =>
    mutation.mutate({
      requests_stale_threshold_hours: form['requests.stale_threshold_hours'],
    });

  return (
    <SectionCard
      title="Traitement des demandes"
      description="Paramètres liés au suivi des demandes de documents."
    >
      <NumberField
        label="Seuil d'alerte « en retard »"
        help="Une demande en attente ou en cours est signalée comme en retard sur le tableau de bord après ce délai."
        unit="heures"
        min={1} max={720}
        value={form['requests.stale_threshold_hours']}
        onChange={v => set('requests.stale_threshold_hours', v)}
      />
      <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
        <Button onClick={save} loading={mutation.isPending}>Enregistrer</Button>
      </div>
    </SectionCard>
  );
}

// ─── Logs & maintenance ──────────────────────────────────────────────────────
function LogsTab({ settings, system, onPurged }: { settings: SettingsMap; system: SystemInfo; onPurged: () => void }) {
  const { form, set, mutation } = useSettingsForm(settings);

  const saveRetention = () =>
    mutation.mutate({ logs_audit_retention_days: form['logs.audit_retention_days'] });

  const purge = useMutation({
    mutationFn: () => api.delete('/admin/settings/read-notifications'),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? 'Notifications purgées.');
      onPurged();
    },
    onError: e => toast.error(getApiError(e)),
  });

  const confirmPurge = () => {
    if (system.notifications_read === 0) {
      toast.info('Aucune notification lue à supprimer.');
      return;
    }
    if (window.confirm(`Supprimer définitivement ${system.notifications_read} notification(s) lue(s) ?`)) {
      purge.mutate();
    }
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Journal d'audit" description="Rétention automatique des entrées du journal.">
        <NumberField
          label="Durée de conservation"
          help="Les entrées plus anciennes pourront être purgées automatiquement. 0 = conservation illimitée (aucune purge automatique)."
          unit="jours"
          min={0} max={3650}
          value={form['logs.audit_retention_days']}
          onChange={v => set('logs.audit_retention_days', v)}
        />
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <Link href="/admin/audit" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
            {icon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2', 'h-4 w-4')}
            Ouvrir le journal d'audit
          </Link>
          <Button onClick={saveRetention} loading={mutation.isPending}>Enregistrer</Button>
        </div>
      </SectionCard>

      <SectionCard title="Maintenance" description="Nettoyage des données non essentielles.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Purger les notifications lues</p>
            <p className="text-xs text-gray-500">
              {system.notifications_read} lue(s) · {system.notifications_unread} non lue(s). Seules les notifications déjà lues sont supprimées.
            </p>
          </div>
          <Button variant="danger" onClick={confirmPurge} loading={purge.isPending}>
            Purger les notifications lues
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Informations système">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SysStat label="PHP" value={system.php_version} />
          <SysStat label="Laravel" value={system.laravel_version} />
          <SysStat label="Utilisateurs" value={system.users} />
          <SysStat label="Demandes" value={system.requests} />
          <SysStat label="Entrées d'audit" value={system.audit_logs} />
          <SysStat label="Notif. lues" value={system.notifications_read} />
          <SysStat label="Notif. non lues" value={system.notifications_unread} />
        </div>
      </SectionCard>
    </div>
  );
}

function SysStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      <p className="truncate text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
