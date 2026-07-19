'use client';

import { useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import type { DocumentRequest, RequestFile } from '@/lib/types';

// Identity fields (name, grade, matricule, recruitment date…) used to be copied
// into the request payload. They belong to the requester's profile, not the
// request, so we hide them here — this also removes empty leftovers like
// "date recrutement: NULL" from older requests still carrying those keys.
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

export default function AdminRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [adminComment, setAdminComment] = useState('');

  const { data: req, isLoading } = useQuery<DocumentRequest>({
    queryKey: ['admin-request', id],
    queryFn: () => api.get(`/requests/${id}`).then(r => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-request', id] });

  const startMutation = useMutation({
    mutationFn: () => api.post(`/admin/requests/${id}/start-processing`),
    onSuccess: () => { toast.success('Demande prise en charge.'); invalidate(); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const validateMutation = useMutation({
    mutationFn: () => api.post(`/admin/requests/${id}/validate`, { comment: adminComment || undefined }),
    onSuccess: () => { toast.success('Demande validée.'); invalidate(); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.post(`/admin/requests/${id}/reject`, { rejection_reason: rejectReason }),
    onSuccess: () => { toast.success('Demande rejetée.'); setShowRejectForm(false); invalidate(); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post(`/admin/requests/${id}/generate-document`),
    onSuccess: () => { toast.success('Document PDF généré.'); invalidate(); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const uploadSignedMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post(`/admin/requests/${id}/upload-signed-document`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => { toast.success('Document signé téléversé. Statut mis à jour.'); invalidate(); },
    onError: (e) => toast.error(getApiError(e)),
  });

  const downloadFile = async (file: RequestFile) => {
    try {
      const res = await api.get(`/documents/${file.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      // Strip path separators so references like "ATT-TRAV-FR/0001/2026.pdf" download correctly.
      a.href = url; a.download = file.original_name.replace(/[/\\]/g, '-'); a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(getApiError(e)); }
  };

  if (isLoading) return <AppShell><div className="p-8 text-sm text-gray-400">Chargement…</div></AppShell>;
  if (!req) return <AppShell><div className="p-8 text-sm text-red-500">Demande introuvable.</div></AppShell>;

  const generatedFiles = req.files?.filter(f => f.type === 'GENERE') ?? [];
  const signedFiles    = req.files?.filter(f => f.type === 'SIGNE') ?? [];

  // Some document types (e.g. attestation de salaire) are not generated from a
  // template — the administration fills them externally and only uploads the
  // finished PDF. Keep this list in sync with the backend
  // (DocumentController::MANUAL_UPLOAD_TYPES).
  const MANUAL_UPLOAD_TYPES = ['ATT-SAL'];
  const isManualUpload = MANUAL_UPLOAD_TYPES.includes(req.document_type?.code ?? '');

  return (
    <AppShell>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-gray-500">{req.reference}</p>
            <h1 className="text-2xl font-bold text-gray-900">{req.document_type?.nom_fr}</h1>
            <p className="text-sm text-gray-500">
              Demandé par{' '}
              <strong>
                {req.requester?.staff_profile
                  ? `${req.requester.staff_profile.prenom_fr} ${req.requester.staff_profile.nom_fr}`
                  : req.requester?.email}
              </strong>
            </p>
          </div>
          <StatusBadge status={req.status} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-6">

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

            {/* Actions panel */}
            <Card>
              <div className="border-b border-gray-100 px-6 py-4">
                <p className="font-semibold text-gray-900">Actions</p>
              </div>
              <CardBody className="flex flex-col gap-4">

                {/* Step 1 — take charge */}
                {req.status === 'EN_ATTENTE' && (
                  <div className="flex items-center justify-between rounded-lg bg-yellow-50 px-4 py-3">
                    <p className="text-sm text-yellow-800">Cette demande est en attente de prise en charge.</p>
                    <Button size="sm" loading={startMutation.isPending} onClick={() => startMutation.mutate()}>
                      Prendre en charge
                    </Button>
                  </div>
                )}

                {/* Step 2 — validate or reject */}
                {req.status === 'EN_COURS' && (
                  <>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">Commentaire (optionnel)</label>
                      <textarea
                        value={adminComment}
                        onChange={e => setAdminComment(e.target.value)}
                        rows={2}
                        placeholder="Commentaire visible par le demandeur…"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        loading={validateMutation.isPending}
                        onClick={() => validateMutation.mutate()}
                      >
                        Valider la demande
                      </Button>
                      <Button variant="danger" onClick={() => setShowRejectForm(v => !v)}>
                        Rejeter
                      </Button>
                    </div>
                    {showRejectForm && (
                      <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
                        <label className="text-sm font-semibold text-red-700">Motif de rejet *</label>
                        <textarea
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          rows={3}
                          placeholder="Expliquez le motif du rejet…"
                          className="rounded-lg border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          className="self-start"
                          disabled={!rejectReason.trim()}
                          loading={rejectMutation.isPending}
                          onClick={() => rejectMutation.mutate()}
                        >
                          Confirmer le rejet
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {/* Step 3 — generate PDF */}
                {req.status === 'VALIDEE' && (
                  <div className="flex flex-col gap-3">
                    {isManualUpload ? (
                      <div className="rounded-lg bg-amber-50 px-4 py-3">
                        <p className="text-sm text-amber-800">
                          Ce document est traité manuellement par l&apos;administration
                          (aucune génération automatique). Remplissez le document en dehors
                          de l&apos;application, puis téléversez le PDF signé ci-dessous.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3">
                        <p className="text-sm text-green-800">Demande validée — générez le document PDF.</p>
                        <Button size="sm" loading={generateMutation.isPending} onClick={() => generateMutation.mutate()}>
                          Générer PDF
                        </Button>
                      </div>
                    )}

                    {/* Download generated */}
                    {generatedFiles.map(f => (
                      <div key={f.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{f.original_name}</p>
                          <p className="text-xs text-gray-400">PDF généré · {(f.size / 1024).toFixed(0)} Ko</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => downloadFile(f)}>Télécharger</Button>
                      </div>
                    ))}

                    {/* Upload signed */}
                    <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center">
                      <p className="text-sm text-gray-600 mb-2">
                        {isManualUpload
                          ? 'Téléversez le document rempli et signé (PDF)'
                          : 'Après signature, téléversez la version signée'}
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) uploadSignedMutation.mutate(f);
                          e.target.value = '';
                        }}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={uploadSignedMutation.isPending}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Téléverser document signé (PDF)
                      </Button>
                    </div>
                  </div>
                )}

                {/* Final state */}
                {req.status === 'DOCUMENT_DISPONIBLE' && (
                  <div className="rounded-lg bg-emerald-50 px-4 py-3">
                    <p className="text-sm font-medium text-emerald-700">Document disponible pour le demandeur.</p>
                  </div>
                )}

                {(req.status === 'REJETEE' || req.status === 'ANNULEE') && (
                  <div className="rounded-lg bg-gray-50 px-4 py-3">
                    <p className="text-sm text-gray-500">Cette demande est clôturée ({req.status}).</p>
                    {req.rejection_reason && (
                      <p className="mt-1 text-sm text-red-600">Motif : {req.rejection_reason}</p>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Signed files list */}
            {signedFiles.length > 0 && (
              <Card>
                <div className="border-b border-gray-100 px-6 py-4">
                  <p className="font-semibold text-gray-900">Document signé</p>
                </div>
                <CardBody className="flex flex-col gap-2">
                  {signedFiles.map(f => (
                    <div key={f.id} className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{f.original_name}</p>
                        <p className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} Ko</p>
                      </div>
                      <Button size="sm" onClick={() => downloadFile(f)}>Télécharger</Button>
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
                    {req.status_histories.map(h => (
                      <li key={h.id} className="flex gap-3">
                        <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                        <div>
                          <p className="text-xs font-medium text-gray-700">
                            {h.old_status ? `${h.old_status} → ` : ''}{h.new_status}
                          </p>
                          {h.comment && <p className="text-xs text-gray-500 italic">{h.comment}</p>}
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
