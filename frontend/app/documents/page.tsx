'use client';

import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { DocumentRequest, Paginated, RequestFile } from '@/lib/types';

export default function DocumentsPage() {
  const { data, isLoading } = useQuery<Paginated<DocumentRequest>>({
    queryKey: ['requests-available'],
    queryFn: () => api.get('/requests', { params: { status: 'DOCUMENT_DISPONIBLE' } }).then(r => r.data),
  });

  const downloadFile = async (file: RequestFile) => {
    try {
      const res = await api.get(`/documents/${file.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mes documents</h1>
          <p className="text-sm text-gray-500">Documents disponibles au téléchargement</p>
        </div>

        <Card>
          <CardBody className="p-0">
            {isLoading ? (
              <p className="px-6 py-10 text-center text-sm text-gray-400">Chargement…</p>
            ) : !data?.data.length ? (
              <p className="px-6 py-10 text-center text-sm text-gray-400">
                Aucun document disponible pour le moment.
              </p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {data.data.map((req) => {
                  const signedFiles = req.files?.filter(f => f.type === 'SIGNE') ?? [];
                  return (
                    <li key={req.id} className="flex items-center justify-between px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{req.document_type?.nom_fr}</p>
                        <p className="font-mono text-xs text-gray-400">{req.reference}</p>
                        <p className="text-xs text-gray-400">
                          Disponible le {req.completed_at ? new Date(req.completed_at).toLocaleDateString('fr-FR') : '—'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {signedFiles.map((f) => (
                          <Button key={f.id} size="sm" onClick={() => downloadFile(f)}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Télécharger
                          </Button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
