'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import type { DocumentRequest, DocumentType, Paginated, RequestStatus } from '@/lib/types';

/**
 * Filtre agrégé : « en cours de traitement » recouvre deux statuts réels.
 * Il n'appartient pas à l'enum backend, d'où ce pseudo-statut côté interface.
 */
const EN_TRAITEMENT = 'EN_TRAITEMENT';

type StatusFilter = RequestStatus | typeof EN_TRAITEMENT | '';

const STATUSES: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'Toutes' },
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: EN_TRAITEMENT, label: 'En cours de traitement' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'VALIDEE', label: 'Validée' },
  { value: 'REJETEE', label: 'Rejetée' },
  { value: 'DOCUMENT_DISPONIBLE', label: 'Document disponible' },
  { value: 'ANNULEE', label: 'Annulée' },
];

const VALID_STATUSES = new Set(STATUSES.map(s => s.value).filter(Boolean));

/** Traduit le filtre d'interface en paramètre attendu par l'API. */
function statusParam(value: StatusFilter): string | string[] | undefined {
  if (!value) return undefined;
  return value === EN_TRAITEMENT ? ['EN_ATTENTE', 'EN_COURS'] : value;
}

const SORTS: { value: string; label: string }[] = [
  { value: 'created_at:desc', label: 'Plus récentes' },
  { value: 'created_at:asc', label: 'Plus anciennes' },
  { value: 'submitted_at:desc', label: 'Soumission récente' },
  { value: 'reference:asc', label: 'Référence (A → Z)' },
];

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

function RequestsList() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const initialStatus = searchParams.get('status') ?? '';
  const [status, setStatus] = useState<StatusFilter>(
    VALID_STATUSES.has(initialStatus as StatusFilter) ? (initialStatus as StatusFilter) : ''
  );
  const [typeId, setTypeId] = useState('');
  const [sort, setSort] = useState('created_at:desc');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  // Évite une requête par frappe : on n'interroge l'API qu'après une pause.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const [sortField, sortDirection] = sort.split(':');

  const { data, isLoading, isFetching } = useQuery<Paginated<DocumentRequest>>({
    queryKey: ['requests', status, typeId, sort, debouncedSearch, page],
    queryFn: () =>
      api
        .get('/requests', {
          params: {
            status: statusParam(status),
            document_type_id: typeId || undefined,
            search: debouncedSearch || undefined,
            sort: sortField,
            direction: sortDirection,
            page,
          },
        })
        .then(r => r.data),
  });

  const { data: types } = useQuery<DocumentType[]>({
    queryKey: ['document-types'],
    queryFn: () => api.get('/document-types').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['requests'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-user'] });
  };

  const submitDraft = useMutation({
    mutationFn: (id: number) => api.post(`/requests/${id}/submit`),
    onSuccess: () => {
      toast.success('Demande soumise à l’administration');
      invalidate();
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const cancelRequest = useMutation({
    mutationFn: (id: number) => api.post(`/requests/${id}/cancel`),
    onSuccess: () => {
      toast.success('Demande annulée');
      invalidate();
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const rows = useMemo(() => data?.data ?? [], [data]);
  const hasFilters = Boolean(status || typeId || debouncedSearch);

  const resetFilters = () => {
    setStatus('');
    setTypeId('');
    setSearch('');
    setPage(1);
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes demandes</h1>
            <p className="text-sm text-gray-500">
              {data
                ? `${data.total} demande${data.total > 1 ? 's' : ''}${hasFilters ? ' correspondant aux filtres' : ' au total'}`
                : 'Suivi de vos demandes de documents'}
            </p>
          </div>
          <Link href="/requests/new">
            <Button>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle demande
            </Button>
          </Link>
        </div>

        {/* Recherche + type + tri */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full flex-1 sm:min-w-[240px]">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par référence ou type de document…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Effacer la recherche"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <select
            value={typeId}
            onChange={(e) => { setTypeId(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Tous les types</option>
            {types?.map((t) => (
              <option key={t.id} value={t.id}>{t.nom_fr}</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Filtres de statut */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => { setStatus(s.value); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors
                ${status === s.value ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {s.label}
            </button>
          ))}
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="ml-1 text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>

        <Card>
          <CardBody className="p-0">
            {isLoading ? (
              <div className="space-y-3 px-6 py-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : !rows.length ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                  <svg className="h-6 w-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">
                  {hasFilters ? 'Aucune demande ne correspond à vos filtres.' : 'Vous n’avez encore aucune demande.'}
                </p>
                <div className="mt-4">
                  {hasFilters ? (
                    <Button variant="secondary" size="sm" onClick={resetFilters}>Réinitialiser les filtres</Button>
                  ) : (
                    <Link href="/requests/new"><Button size="sm">Créer ma première demande</Button></Link>
                  )}
                </div>
              </div>
            ) : (
              <div className={`overflow-x-auto transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                      <th className="px-6 py-3">Référence</th>
                      <th className="px-6 py-3">Type de document</th>
                      <th className="px-6 py-3">Statut</th>
                      <th className="px-6 py-3">Créée le</th>
                      <th className="px-6 py-3">Soumise le</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((req) => {
                      const isDraft = req.status === 'BROUILLON';
                      const canCancel = req.status === 'EN_ATTENTE' || isDraft;
                      const busy = submitDraft.isPending || cancelRequest.isPending;

                      return (
                        <tr key={req.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50/70">
                          <td className="px-6 py-3">
                            <Link href={`/requests/${req.id}`} className="font-mono text-blue-600 hover:underline">
                              {isDraft ? 'Brouillon' : req.reference}
                            </Link>
                          </td>
                          <td className="px-6 py-3 text-gray-700">
                            {req.document_type?.nom_fr ?? '—'}
                            {req.language && (
                              <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-500">
                                {req.language}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3"><StatusBadge status={req.status} /></td>
                          <td className="px-6 py-3 text-gray-400">{formatDate(req.created_at)}</td>
                          <td className="px-6 py-3 text-gray-400">{formatDate(req.submitted_at)}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center justify-end gap-3 text-xs">
                              {isDraft && (
                                <>
                                  <Link href={`/requests/${req.id}`} className="text-gray-500 hover:text-gray-700 hover:underline">
                                    Modifier
                                  </Link>
                                  <button
                                    disabled={busy}
                                    onClick={() => submitDraft.mutate(req.id)}
                                    className="font-medium text-blue-600 hover:underline disabled:opacity-50"
                                  >
                                    Soumettre
                                  </button>
                                </>
                              )}
                              {req.status === 'DOCUMENT_DISPONIBLE' && (
                                <Link href="/documents" className="font-medium text-emerald-600 hover:underline">
                                  Télécharger
                                </Link>
                              )}
                              {canCancel && (
                                <button
                                  disabled={busy}
                                  onClick={() => {
                                    if (confirm('Annuler définitivement cette demande ?')) cancelRequest.mutate(req.id);
                                  }}
                                  className="text-red-500 hover:underline disabled:opacity-50"
                                >
                                  Annuler
                                </button>
                              )}
                              <Link href={`/requests/${req.id}`} className="text-blue-600 hover:underline">
                                Voir
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {data && data.last_page > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                <p className="text-xs text-gray-400">
                  Page {data.current_page} / {data.last_page} · {data.total} résultats
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    Précédent
                  </Button>
                  <Button variant="secondary" size="sm" disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)}>
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

// useSearchParams() impose une frontière Suspense : sans elle, Next.js échoue au
// prérendu de cette page (les filtres ne sont connus que côté client).
export default function RequestsPage() {
  return (
    <Suspense fallback={<AppShell><p className="p-8 text-sm text-gray-400">Chargement…</p></AppShell>}>
      <RequestsList />
    </Suspense>
  );
}
