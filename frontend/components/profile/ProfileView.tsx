'use client';

import { Card, CardBody } from '@/components/ui/Card';
import type { StaffProfile } from '@/lib/types';

export function Row({ label, value, dir }: { label: string; value?: string | number | null; dir?: string }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800" dir={dir}>{String(value)}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="border-b border-gray-100 px-6 py-4">
        <p className="font-semibold text-gray-900">{title}</p>
      </div>
      <CardBody>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</dl>
      </CardBody>
    </Card>
  );
}

export function ProfileView({ profile, email }: { profile: StaffProfile; email?: string }) {
  const pp = profile.professor_profile;
  const ep = profile.employee_profile;

  return (
    <div className="flex flex-col gap-6">
      <Section title="Identité">
        {email && <Row label="Email" value={email} />}
        <Row label="Téléphone" value={profile.telephone} />
        <Row label="Sexe" value={profile.sexe === 'M' ? 'Masculin' : profile.sexe === 'F' ? 'Féminin' : null} />
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
