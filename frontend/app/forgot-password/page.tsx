'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Le parcours de récupération vit désormais sur /login, où les étapes glissent
 * l'une vers l'autre. Cette route est conservée pour les liens et favoris déjà
 * diffusés.
 */
export default function ForgotPasswordRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm text-gray-400">Redirection…</p>
    </main>
  );
}
