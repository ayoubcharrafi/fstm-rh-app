// Métadonnées & helpers partagés pour l'affichage des notifications.

export interface TypeMeta {
  label: string;
  path: string;   // tracé SVG de l'icône
  tone: string;   // classes Tailwind (fond + texte)
  dot: string;    // classe Tailwind de la pastille de couleur
}

const BELL_PATH =
  'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9';

const MEGAPHONE_PATH =
  'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z';

// Métadonnées par type de notification (label + icône + couleurs).
export const TYPE_META: Record<string, TypeMeta> = {
  'request.submitted':  { label: 'Demande soumise', path: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', tone: 'bg-blue-50 text-blue-600',    dot: 'bg-blue-500' },
  'request.processing': { label: 'En cours',         path: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',                                                                                          tone: 'bg-amber-50 text-amber-600',  dot: 'bg-amber-500' },
  'request.validated':  { label: 'Validée',          path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',                                                                                       tone: 'bg-green-50 text-green-600',  dot: 'bg-green-500' },
  'request.rejected':   { label: 'Rejetée',          path: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',                                                              tone: 'bg-red-50 text-red-600',      dot: 'bg-red-500' },
  'document.available': { label: 'Document prêt',    path: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',                                                                     tone: 'bg-indigo-50 text-indigo-600', dot: 'bg-indigo-500' },
  'admin.announcement': { label: 'Annonce',          path: MEGAPHONE_PATH,                                                                                                                       tone: 'bg-purple-50 text-purple-600', dot: 'bg-purple-500' },
};

export function typeMeta(type: string): TypeMeta {
  return TYPE_META[type] ?? { label: 'Notification', path: BELL_PATH, tone: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' };
}

// Temps relatif en français.
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j < 30) return `il y a ${j} j`;
  const mois = Math.floor(j / 30);
  return `il y a ${mois} mois`;
}

export function fullDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}
