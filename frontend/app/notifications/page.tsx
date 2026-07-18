'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Notification, Paginated } from '@/lib/types';

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data } = useQuery<Paginated<Notification>>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
  });

  const readAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markRead = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = data?.data.filter(n => !n.read_at).length ?? 0;

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unread > 0 && <p className="text-sm text-gray-500">{unread} non lue{unread > 1 ? 's' : ''}</p>}
          </div>
          {unread > 0 && (
            <Button variant="secondary" size="sm" loading={readAll.isPending} onClick={() => readAll.mutate()}>
              Tout marquer comme lu
            </Button>
          )}
        </div>

        <Card>
          <CardBody className="p-0">
            {!data?.data.length ? (
              <p className="px-6 py-10 text-center text-sm text-gray-400">Aucune notification.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {data.data.map((n) => (
                  <li key={n.id} className={`flex items-start gap-4 px-6 py-4 ${!n.read_at ? 'bg-blue-50/40' : ''}`}>
                    <div className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${!n.read_at ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-sm text-gray-600">{n.message}</p>
                      <p className="mt-1 text-xs text-gray-400">{new Date(n.created_at).toLocaleString('fr-FR')}</p>
                    </div>
                    {!n.read_at && (
                      <button onClick={() => markRead.mutate(n.id)} className="text-xs text-blue-600 hover:underline flex-shrink-0">
                        Marquer lu
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
