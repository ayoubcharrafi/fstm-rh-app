'use client';

import { Card, CardBody } from '@/components/ui/Card';
import type { AccountOverview, StaffProfile } from '@/lib/types';

export function Row({ label, value, dir }: { label: string; value?: string | number | null; dir?: string }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800" dir={dir}>{String(value)}</dd>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="border-b border-gray-100 px-6 py-4">
        <p className="font-semibold text-gray-900">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      </div>
      <CardBody>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</dl>
      </CardBody>
    </Card>
  );
}

const ROLES: Record<string, string> = {
  ADMIN:      'Administrateur',
  PROFESSEUR: 'Professeur',
  EMPLOYE:    'Employé',
};

/** Horodatage ISO en date lisible ; l'absence de valeur reste absente. */
function formatDateTime(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

const SEXE: Record<string, string> = { M: 'Masculin', F: 'Féminin' };

/**
 * Profil administrateur : identité et compte uniquement.
 *
 * Un administrateur n'a pas de dossier RH — ni grade, ni matricule, ni solde de
 * congé. Ces sections ne sont pas seulement masquées ici : les données
 * correspondantes ont été retirées de la base (migration 2026_07_29_000001).
 */
function AdminProfile({ profile, email, account }: {
  profile: StaffProfile;
  email?: string;
  account?: AccountOverview | null;
}) {
  const derniereConnexion = formatDateTime(account?.last_login_at);

  return (
    <div className="flex flex-col gap-6">
      <Section title="Identité">
        <Row label="Nom" value={profile.nom_fr} />
        <Row label="Prénom" value={profile.prenom_fr} />
        {profile.nom_ar && <Row label="Nom (AR)" value={profile.nom_ar} dir="rtl" />}
        {profile.prenom_ar && <Row label="Prénom (AR)" value={profile.prenom_ar} dir="rtl" />}
        <Row label="Sexe" value={profile.sexe ? SEXE[profile.sexe] : null} />
        <Row label="Date de naissance" value={profile.date_naissance} />
        <Row label="Lieu de naissance" value={profile.lieu_naissance} />
      </Section>

      <Section title="Coordonnées">
        <Row label="Email professionnel" value={email} />
        <Row label="Téléphone" value={profile.telephone} />
        <Row label="Fonction / Poste" value={profile.fonction} />
      </Section>

      <Section title="Compte" subtitle="Informations de connexion et d'accès">
        <Row label="Rôle" value={ROLES[account?.role ?? 'ADMIN'] ?? 'Administrateur'} />
        <Row label="Statut" value={account ? (account.is_active ? 'Actif' : 'Désactivé') : null} />
        <Row label="Dernière connexion" value={derniereConnexion ?? 'Jamais'} />
        <Row label="Membre depuis" value={formatDateTime(account?.created_at)} />
      </Section>
    </div>
  );
}

export function ProfileView({ profile, email, isAdmin, account }: {
  profile: StaffProfile;
  email?: string;
  isAdmin: boolean;
  account?: AccountOverview | null;
}) {
  const pp = profile.professor_profile;
  const ep = profile.employee_profile;

  if (isAdmin) {
    return <AdminProfile profile={profile} email={email} account={account} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Section title="Identité">
        {email && <Row label="Email" value={email} />}
        <Row label="Téléphone" value={profile.telephone} />
        <Row label="Sexe" value={profile.sexe ? SEXE[profile.sexe] : null} />
        <Row label="Date de naissance" value={profile.date_naissance} />
        <Row label="Lieu de naissance" value={profile.lieu_naissance} />
        <Row label="CIN" value={profile.cin} />
        <Row label="N° Matricule (DOTI)" value={profile.doti} />
      </Section>

      <Section title="Situation administrative">
        <Row label="Grade (FR)" value={profile.grade?.intitule_fr} />
        {profile.grade?.intitule_ar && <Row label="Grade (AR)" value={profile.grade.intitule_ar} dir="rtl" />}
        <Row label="Département" value={profile.organizational_unit?.nom_fr} />
        <Row label="Situation administrative" value={profile.situation_administrative} />
        <Row label="Date de recrutement" value={profile.date_recrutement} />
      </Section>

      {pp && (
        <Section title="Profil Professeur">
          <Row label="Spécialité" value={pp.specialite} />
          <Row label="Date de prise de fonction" value={pp.date_prise_fonction} />
          <Row label="Date d'habilitation" value={pp.date_habilitation} />
        </Section>
      )}

      {ep && (
        <Section title="Profil Employé">
          <Row label="Fonction actuelle" value={ep.fonction_actuelle} />
          <Row label="Date d'affectation" value={ep.date_affectation} />
          <Row label="Situation familiale" value={ep.situation_familiale} />
          <Row label="Nombre d'enfants" value={ep.nombre_enfants} />
          <Row label="Ancienneté" value={ep.anciennete} />
          <Row label="Solde congé" value={ep.solde_conge ? `${ep.solde_conge} jours` : null} />
          <Row label="Congé reporté" value={ep.conge_reporte ? `${ep.conge_reporte} jours` : null} />
        </Section>
      )}
    </div>
  );
}
