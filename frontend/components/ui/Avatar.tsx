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
