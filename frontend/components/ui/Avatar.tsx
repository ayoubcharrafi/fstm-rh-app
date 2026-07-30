'use client';

const SIZES = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-16 w-16 text-2xl',
  lg: 'h-24 w-24 text-3xl',
  xl: 'h-28 w-28 text-4xl',
} as const;

interface AvatarProps {
  photoUrl?: string | null;
  initials: string;
  size?: keyof typeof SIZES;
  className?: string;
}

export function Avatar({ photoUrl, initials, size = 'md', className = '' }: AvatarProps) {
  const base = `flex items-center justify-center overflow-hidden rounded-full font-bold ${SIZES[size]} ${className}`;

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={initials}
        className={`${base} bg-gray-100 object-cover`}
      />
    );
  }

  return (
    <div className={`${base} bg-blue-100 text-blue-600`}>
      {initials}
    </div>
  );
}

/** Teinte de repli quand l'agent n'a pas encore déposé de photo. */
export const ROLE_AVATAR: Record<string, string> = {
  ADMIN:      'bg-purple-100 text-purple-700',
  PROFESSEUR: 'bg-blue-100 text-blue-700',
  EMPLOYE:    'bg-orange-100 text-orange-700',
};

/** Initiales prénom + nom, avec repli sur l'email pour un compte sans profil. */
export function initialsOf(user: {
  email: string;
  staff_profile?: { prenom_fr?: string | null; nom_fr?: string | null } | null;
}): string {
  const p = user.staff_profile;
  if (p?.prenom_fr) {
    return `${p.prenom_fr[0] ?? ''}${p.nom_fr?.[0] ?? ''}`.toUpperCase();
  }
  return (user.email[0] ?? '?').toUpperCase();
}
