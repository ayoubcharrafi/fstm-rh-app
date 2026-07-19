'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import type { DocumentRequest, RequestFile } from '@/lib/types';

// Identity fields belong to the profile, not the request payload. Hide them (and
// any empty values) so leftovers like "date recrutement: NULL" from older
// requests don't show up.
const HIDDEN_PAYLOAD_KEYS = new Set([
  'nom_fr', 'prenom_fr', 'nom_ar', 'prenom_ar',
  'grade_fr', 'grade_ar', 'doti', 'unite_fr', 'date_recrutement',
]);

function visiblePayloadEntries(payload: Record<string, unknown> | null | undefined) {
  if (!payload) return [];
  return Object.entries(payload).filter(([k, v]) =>
    !HIDDEN_PAYLOAD_KEYS.has(k) && v !== null && v !== '' && v !== undefined
  );
}

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: req, isLoading } = useQuery<DocumentRequest>({
    queryKey: ['request', id],
    queryFn: () => api.get(`/requests/${id}`).then(r => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/requests/${id}/cancel`),
    onSuccess: () => { toast.success('Demande annulée.'); qc.invalidateQueries({ queryKey: ['request', id] }); },
    onError: (err) => toast.error(getApiError(err)),
  });

  const downloadFile = async (file: RequestFile) => {
    try {
      const res = await api.get(`/documents/${file.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      // Strip path separators so references like "ATT-TRAV-FR/0001/2026.pdf" download correctly.
      a.download = file.original_name.replace(/[/\\]/g, '-');
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  if (isLoading) return <AppShell><div className="p-8 text-sm text-gray-400">Chargement…</div></AppShell>;
  if (!req) return <AppShell><div className="p-8 text-sm text-red-500">Demande introuvable.</div></AppShell>;

  const canCancel = (req.status === 'BROUILLON' || req.status === 'EN_ATTENTE') && req.requester_id === user?.id;
  const signedFiles = req.files?.filter(f => f.type === 'SIGNE') ?? [];

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-sm text-gray-500">{req.reference}</p>
            <h1 className="text-2xl font-bold text-gray-900">{req.document_type?.nom_fr}</h1>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={req.status} />
            {canCancel && (
              <Button variant="danger" size="sm" loading={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
                Annuler
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Details */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Rejection reason */}
            {req.rejection_reason && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4">
                <p className="text-sm font-semibold text-red-700">Motif de rejet</p>
                <p className="mt-1 text-sm text-red-600">{req.rejection_reason}</p>
              </div>
            )}

            {/* Admin comment */}
            {req.admin_comment && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-4">
                <p className="text-sm font-semibold text-blue-700">Commentaire de l'administration</p>
                <p className="mt-1 text-sm text-blue-600">{req.admin_comment}</p>
              </div>
            )}

            {/* Payload */}
            {visiblePayloadEntries(req.payload).length > 0 && (
              <Card>
                <div className="border-b border-gray-100 px-6 py-4">
                  <p className="font-semibold text-gray-900">Informations de la demande</p>
                </div>
                <CardBody>
                  <dl className="grid grid-cols-2 gap-4">
                    {visiblePayloadEntries(req.payload).map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{k.replace(/_/g, ' ')}</dt>
                        <dd className="mt-1 text-sm text-gray-700">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </CardBody>
              </Card>
            )}

            {/* Documents disponibles */}
            {signedFiles.length > 0 && (
              <Card>
                <div className="border-b border-gray-100 px-6 py-4">
                  <p className="font-semibold text-gray-900">Document final</p>
                </div>
                <CardBody className="flex flex-col gap-2">
                  {signedFiles.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{f.original_name}</p>
                        <p className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} Ko</p>
                      </div>
                      <Button size="sm" onClick={() => downloadFile(f)}>
                        Télécharger
                      </Button>
                    </div>
                  ))}
                </CardBody>
              </Card>
            )}
          </div>

          {/* Timeline */}
          <div>
            <Card>
              <div className="border-b border-gray-100 px-6 py-4">
                <p className="font-semibold text-gray-900">Historique</p>
              </div>
              <CardBody>
                {!req.status_histories?.length ? (
                  <p className="text-sm text-gray-400">Aucun historique.</p>
                ) : (
                  <ol className="flex flex-col gap-4">
                    {req.status_histories.map((h) => (
                      <li key={h.id} className="flex gap-3">
                        <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                        <div>
                          <p className="text-xs font-medium text-gray-700">
                            {h.old_status ? `${h.old_status} → ` : ''}{h.new_status}
                          </p>
                          {h.comment && <p className="text-xs text-gray-500">{h.comment}</p>}
                          <p className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString('fr-FR')}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
