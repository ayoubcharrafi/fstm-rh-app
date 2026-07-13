import { getApiHealth } from "@/lib/api";

const modules = [
  { name: "Employes", description: "Profils, contrats et informations administratives." },
  { name: "Conges", description: "Demandes, validations et historique des absences." },
  { name: "Departements", description: "Organisation interne, equipes et responsables." },
  { name: "Tableau de bord", description: "Indicateurs RH et suivi des activites." },
];

export default async function Home() {
  const health = await getApiHealth();
  const apiOnline = health?.status === "ok";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-teal-700">FST RH</p>
            <h1 className="mt-2 text-3xl font-semibold">Espace de gestion RH</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Base propre pour commencer le developpement: Laravel API, Next.js et MySQL.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-500">API</p>
            <p className={apiOnline ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
              {apiOnline ? "Connectee" : "Indisponible"}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <h2 className="text-xl font-semibold">Modules a developper</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {modules.map((module) => (
              <article key={module.name} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold">{module.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{module.description}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Etat technique</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">Backend</dt>
              <dd className="font-medium">Laravel API</dd>
            </div>
            <div>
              <dt className="text-slate-500">Frontend</dt>
              <dd className="font-medium">Next.js + TypeScript</dd>
            </div>
            <div>
              <dt className="text-slate-500">Database</dt>
              <dd className="font-medium">{health?.database ?? "mysql"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Endpoint</dt>
              <dd className="break-all font-mono text-xs">/api/health</dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  );
}