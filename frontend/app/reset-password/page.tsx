'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Suspense } from 'react';
import { api, getApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const schema = z.object({
  password: z.string().min(8, 'Minimum 8 caractères'),
  password_confirmation: z.string(),
}).refine(d => d.password === d.password_confirmation, {
  message: 'Les mots de passe ne correspondent pas.',
  path: ['password_confirmation'],
});
type FormData = z.infer<typeof schema>;

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token  = params.get('token') ?? '';
  const email  = params.get('email') ?? '';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/reset-password', { ...data, token, email });
      toast.success('Mot de passe réinitialisé.');
      router.replace('/login');
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  if (!token || !email) {
    return <p className="text-center text-sm text-red-500">Lien invalide ou expiré.</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" autoComplete="off">
      <Input label="Nouveau mot de passe" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
      <Input label="Confirmer" type="password" autoComplete="new-password" error={errors.password_confirmation?.message} {...register('password_confirmation')} />
      <Button type="submit" loading={isSubmitting} className="w-full">Réinitialiser</Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Nouveau mot de passe</h1>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <Suspense fallback={<p className="text-center text-sm text-gray-400">Chargement…</p>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
