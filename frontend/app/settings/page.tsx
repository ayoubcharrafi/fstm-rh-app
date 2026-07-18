'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api, getApiError } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const schema = z.object({
  telephone:            z.string().optional(),
  password:             z.string().min(8, 'Minimum 8 caractères').optional().or(z.literal('')),
  password_confirmation: z.string().optional().or(z.literal('')),
}).refine(d => !d.password || d.password === d.password_confirmation, {
  message: 'Les mots de passe ne correspondent pas.',
  path: ['password_confirmation'],
});

type FormData = z.infer<typeof schema>;

export default function SettingsPage() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.patch('/profile/contact', {
        telephone: data.telephone || undefined,
        password:  data.password || undefined,
        password_confirmation: data.password_confirmation || undefined,
      });
      toast.success('Informations mises à jour.');
      reset({ password: '', password_confirmation: '' });
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-sm text-gray-500">Modifiez vos coordonnées et votre mot de passe</p>
        </div>

        <div className="max-w-lg">
          <Card>
            <div className="border-b border-gray-100 px-6 py-4">
              <p className="font-semibold text-gray-900">Coordonnées & sécurité</p>
            </div>
            <CardBody>
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" autoComplete="off">
                <Input
                  label="Téléphone"
                  type="tel"
                  autoComplete="off"
                  placeholder="+212 6XX XXX XXX"
                  error={errors.telephone?.message}
                  {...register('telephone')}
                />

                <hr className="border-gray-100" />

                <Input
                  label="Nouveau mot de passe"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Laisser vide pour ne pas modifier"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <Input
                  label="Confirmer le mot de passe"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirmer le nouveau mot de passe"
                  error={errors.password_confirmation?.message}
                  {...register('password_confirmation')}
                />

                <Button type="submit" loading={isSubmitting} className="self-start">
                  Enregistrer
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
