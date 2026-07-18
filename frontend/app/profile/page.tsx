'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { RoleBadge } from '@/components/ui/Badge';

function Row({ label, value, dir }: { label: string; value?: string | number | null; dir?: string }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800" dir={dir}>{String(value)}</dd>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const p = user?.staff_profile;
  const ep = p?.employee_profile;
  const pp = p?.professor_profile;

  const initials = p
    ? `${p.prenom_fr?.[0] ?? ''}${p.nom_fr?.[0] ?? ''}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
          <p className="text-sm text-gray-500">Vos informations administratives</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Avatar card */}
          <Card>
            <CardBody className="flex flex-col items-center py-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
                {initials}
              </div>
              {p ? (
                <>
                  <p className="text-lg font-semibold text-gray-900">{p.prenom_fr} {p.nom_fr}</p>
                  {p.nom_ar && (
                    <p className="text-sm text-gray-500 mt-0.5" dir="rtl">{p.prenom_ar} {p.nom_ar}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-600">{user?.email}</p>
              )}
              <div className="mt-3"><RoleBadge role={user?.role ?? ''} /></div>
              {p?.doti && <p className="mt-2 font-mono text-xs text-gray-400">Matricule : {p.doti}</p>}
              {p?.cin  && <p className="font-mono text-xs text-gray-400">CIN : {p.cin}</p>}
            </CardBody>
          </Card>

          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Identité */}
            <Card>
              <div className="border-b border-gray-100 px-6 py-4">
                <p className="font-semibold text-gray-900">Identité</p>
              </div>
              <CardBody>
                <dl className="grid grid-cols-2 gap-4">
                  <Row label="Email" value={user?.email} />
                  <Row label="Téléphone" value={p?.telephone} />
                  <Row label="Sexe" value={p?.sexe === 'M' ? 'Masculin' : p?.sexe === 'F' ? 'Féminin' : null} />
                  <Row label="Date de naissance" value={p?.date_naissance} />
                  <Row label="Lieu de naissance" value={p?.lieu_naissance} />
                  <Row label="CIN" value={p?.cin} />
                </dl>
              </CardBody>
            </Card>

            {/* Situation administrative */}
            {p && (
              <Card>
                <div className="border-b border-gray-100 px-6 py-4">
                  <p className="font-semibold text-gray-900">Situation administrative</p>
                </div>
                <CardBody>
                  <dl className="grid grid-cols-2 gap-4">
                    <Row label="Grade (FR)" value={p.grade?.intitule_fr} />
                    {p.grade?.intitule_ar && <Row label="Grade (AR)" value={p.grade.intitule_ar} dir="rtl" />}
                    <Row label="Département" value={p.organizational_unit?.nom_fr} />
                    <Row label="Situation administrative" value={p.situation_administrative} />
                    <Row label="Date de recrutement" value={p.date_recrutement} />
                    <Row label="N° Matricule" value={p.doti} />
                  </dl>
                </CardBody>
              </Card>
            )}

            {/* Profil Professeur */}
            {pp && (
              <Card>
                <div className="border-b border-gray-100 px-6 py-4">
                  <p className="font-semibold text-gray-900">Profil Professeur</p>
                </div>
                <CardBody>
                  <dl className="grid grid-cols-2 gap-4">
                    <Row label="Spécialité" value={pp.specialite} />
                    <Row label="Date de prise de fonction" value={pp.date_prise_fonction} />
                    <Row label="Date d'habilitation" value={pp.date_habilitation} />
                  </dl>
                </CardBody>
              </Card>
            )}

            {/* Profil Employé */}
            {ep && (
              <Card>
                <div className="border-b border-gray-100 px-6 py-4">
                  <p className="font-semibold text-gray-900">Profil Employé</p>
                </div>
                <CardBody>
                  <dl className="grid grid-cols-2 gap-4">
                    <Row label="Fonction actuelle" value={ep.fonction_actuelle} />
                    <Row label="Date d'affectation" value={ep.date_affectation} />
                    <Row label="Situation familiale" value={ep.situation_familiale} />
                    <Row label="Nombre d'enfants" value={ep.nombre_enfants} />
                    <Row label="Ancienneté" value={ep.anciennete} />
                    <Row label="Solde congé" value={ep.solde_conge ? `${ep.solde_conge} jours` : null} />
                    <Row label="Congé reporté" value={ep.conge_reporte ? `${ep.conge_reporte} jours` : null} />
                  </dl>
                </CardBody>
              </Card>
            )}

            <div className="text-right">
              <a href="/settings" className="text-sm text-blue-600 hover:underline">
                Modifier mes coordonnées →
              </a>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
