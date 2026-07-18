'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const schema = z.object({ email: z.string().email('Email invalide') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting, isSubmitSuccessful } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/forgot-password', data);
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Mot de passe oublié</h1>
          <p className="mt-1 text-sm text-gray-500">Entrez votre email pour recevoir un lien de réinitialisation</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          {isSubmitSuccessful ? (
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-sm font-medium text-green-700">Si cet email existe, un lien de réinitialisation a été envoyé.</p>
              <a href="/login" className="mt-3 block text-sm text-blue-600 hover:underline">Retour à la connexion</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input label="Adresse email" type="email" error={errors.email?.message} {...register('email')} />
              <Button type="submit" loading={isSubmitting} className="w-full">Envoyer le lien</Button>
              <a href="/login" className="text-center text-sm text-gray-400 hover:text-gray-600">Retour à la connexion</a>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
