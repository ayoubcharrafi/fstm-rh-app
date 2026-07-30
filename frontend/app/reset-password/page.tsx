'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * La saisie du code se fait désormais sur /login, dans la continuité de la
 * demande. Route conservée pour les liens déjà diffusés.
 */
export default function ResetPasswordRedirect() {
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
