'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/lib/hooks/useAuth';
import { getApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const schema = z.object({
  email:    z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      const me = await import('@/lib/api').then(m => m.api.get('/auth/me'));
      router.replace(me.data.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard');
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <img
            src="/logo_FSTMohammedia.png"
            alt="FST Mohammedia"
            className="mx-auto mb-5 h-auto w-44 object-contain"
          />
          <h1 className="text-2xl font-bold text-gray-900">Gestion RH</h1>
          <p className="mt-1 text-sm text-gray-500">Connectez-vous à votre espace</p>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Adresse email"
              type="email"
              placeholder="vous@fst.ma"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex justify-end">
              <a href="/forgot-password" className="text-xs text-blue-600 hover:underline">
                Mot de passe oublié ?
              </a>
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full mt-1">
              Se connecter
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
