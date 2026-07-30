'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { DocumentRequest, DocumentType, Paginated, RequestFile } from '@/lib/types';

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
}

function formatSize(bytes: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

export default function DocumentsPage() {
  const [typeId, setTypeId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching } = useQuery<Paginated<DocumentRequest>>({
    queryKey: ['requests-available', typeId, debouncedSearch, page],
    queryFn: () =>
      api
        .get('/requests', {
          params: {
            status: 'DOCUMENT_DISPONIBLE',
            document_type_id: typeId || undefined,
            search: debouncedSearch || undefined,
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

  // Les demandes en cours ne sont pas des documents, mais l'utilisateur veut
  // savoir ce qui arrive — d'où le bandeau « en préparation ».
  const { data: pending } = useQuery<Paginated<DocumentRequest>>({
    queryKey: ['requests-in-flight'],
    queryFn: () => api.get('/requests', { params: { status: 'VALIDEE' } }).then(r => r.data),
  });

  const downloadFile = async (file: RequestFile) => {
    setDownloadingId(file.id);
    try {
      const res = await api.get(`/documents/${file.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      // Les références contiennent des « / » : on les neutralise pour le nom de fichier.
      a.download = file.original_name.replace(/[/\\]/g, '-');
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Téléchargement démarré');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setDownloadingId(null);
    }
  };

  const rows = useMemo(() => data?.data ?? [], [data]);
  const hasFilters = Boolean(typeId || debouncedSearch);
  const pendingCount = pending?.total ?? 0;

  const resetFilters = () => {
    setTypeId('');
    setSearch('');
    setPage(1);
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes documents</h1>
            <p className="text-sm text-gray-500">
              {data
                ? `${data.total} document${data.total > 1 ? 's' : ''} disponible${data.total > 1 ? 's' : ''} au téléchargement`
                : 'Vos documents signés, prêts à télécharger'}
            </p>
          </div>
          <Link href="/requests/new">
            <Button variant="secondary">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Demander un document
            </Button>
          </Link>
        </div>

        {pendingCount > 0 && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-800">
              {pendingCount} demande{pendingCount > 1 ? 's' : ''} validée{pendingCount > 1 ? 's' : ''} — le document est en cours de
              préparation par l’administration. Vous serez notifié dès qu’il sera disponible.{' '}
              <Link href="/requests?status=VALIDEE" className="font-medium underline underline-offset-2">
                Voir
              </Link>
            </p>
          </div>
        )}

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
              placeholder="Rechercher un document par référence ou par type…"
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

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardBody className="space-y-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </CardBody>
              </Card>
            ))}
          </div>
        ) : !rows.length ? (
          <Card>
            <CardBody className="px-6 py-16 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                <svg className="h-6 w-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">
                {hasFilters ? 'Aucun document ne correspond à vos filtres.' : 'Aucun document disponible pour le moment.'}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {hasFilters
                  ? 'Essayez un autre type ou une autre référence.'
                  : 'Vos documents apparaîtront ici une fois signés par l’administration.'}
              </p>
              <div className="mt-4">
                {hasFilters ? (
                  <Button variant="secondary" size="sm" onClick={resetFilters}>Réinitialiser les filtres</Button>
                ) : (
                  <Link href="/requests/new"><Button size="sm">Demander un document</Button></Link>
                )}
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className={`grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${isFetching ? 'opacity-60' : ''}`}>
            {rows.map((req) => {
              // Seuls les fichiers SIGNE sont téléchargeables par le demandeur
              // (l'API refuse PIECE_JOINTE et GENERE aux non-admins).
              const signedFiles = req.files?.filter(f => f.type === 'SIGNE') ?? [];

              return (
                <Card key={req.id} className="transition-shadow hover:shadow-md">
                  <CardBody className="flex h-full flex-col">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                        <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      {req.language && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-500">
                          {req.language}
                        </span>
                      )}
                    </div>

                    <p className="font-medium leading-snug text-gray-900">{req.document_type?.nom_fr ?? 'Document'}</p>
                    <Link href={`/requests/${req.id}`} className="mt-0.5 font-mono text-xs text-blue-600 hover:underline">
                      {req.reference}
                    </Link>
                    <p className="mt-2 text-xs text-gray-400">Disponible depuis le {formatDate(req.completed_at)}</p>

                    <div className="mt-4 flex-1 space-y-2">
                      {signedFiles.length === 0 ? (
                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          Le fichier n’est pas encore rattaché. Contactez l’administration si cela persiste.
                        </p>
                      ) : (
                        signedFiles.map((f) => (
                          <div key={f.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-gray-700">{f.original_name}</p>
                              <p className="text-[11px] text-gray-400">{formatSize(f.size)}</p>
                            </div>
                            <Button
                              size="sm"
                              loading={downloadingId === f.id}
                              onClick={() => downloadFile(f)}
                            >
                              {downloadingId !== f.id && (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              )}
                              PDF
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}

        {data && data.last_page > 1 && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-100 bg-white px-6 py-3">
            <p className="text-xs text-gray-400">
              Page {data.current_page} / {data.last_page} · {data.total} documents
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
      </div>
    </AppShell>
  );
}
