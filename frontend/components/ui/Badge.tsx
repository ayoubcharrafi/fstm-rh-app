import type { RequestStatus } from '@/lib/types';

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  BROUILLON:           { label: 'Brouillon',           className: 'bg-gray-100 text-gray-600' },
  EN_ATTENTE:          { label: 'En attente',          className: 'bg-yellow-100 text-yellow-700' },
  EN_COURS:            { label: 'En cours',            className: 'bg-blue-100 text-blue-700' },
  VALIDEE:             { label: 'Validée',             className: 'bg-green-100 text-green-700' },
  REJETEE:             { label: 'Rejetée',             className: 'bg-red-100 text-red-700' },
  DOCUMENT_DISPONIBLE: { label: 'Document disponible', className: 'bg-emerald-100 text-emerald-700' },
  ANNULEE:             { label: 'Annulée',             className: 'bg-gray-100 text-gray-500' },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const cfg =
    role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
    role === 'PROFESSEUR' ? 'bg-blue-100 text-blue-700' :
    'bg-orange-100 text-orange-700';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg}`}>
      {role}
    </span>
  );
}
