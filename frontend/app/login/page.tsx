'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/lib/hooks/useAuth';
import { api, getApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from '@/components/layout/AuthLayout';

/**
 * Les trois étapes d'authentification vivent sur cet écran unique : c'est ce qui
 * permet au décor de glisser d'un côté à l'autre. Des routes séparées
 * rechargeraient le document et couperaient l'animation.
 */
type Etape = 'login' | 'email' | 'code';

const TEXTES: Record<Etape, { titre: string; sous: string }> = {
  login: { titre: 'Connexion',           sous: 'Accédez à votre espace personnel' },
  email: { titre: 'Mot de passe oublié', sous: 'Nous vous enverrons un code de vérification' },
  code:  { titre: 'Nouveau mot de passe', sous: 'Saisissez le code reçu par email' },
};

export default function LoginPage() {
  const [etape, setEtape] = useState<Etape>('login');
  const [email, setEmail] = useState('');

  return (
    <AuthLayout
      side={etape === 'login' ? 'left' : 'right'}
      formKey={etape}
      title={TEXTES[etape].titre}
      subtitle={TEXTES[etape].sous}
    >
      {etape === 'login' && <FormLogin onOublie={() => setEtape('email')} />}

      {etape === 'email' && (
        <FormEmail
          onRetour={() => setEtape('login')}
          onEnvoye={(adresse) => { setEmail(adresse); setEtape('code'); }}
        />
      )}

      {etape === 'code' && (
        <FormCode
          email={email}
          onRetour={() => setEtape('login')}
        />
      )}
    </AuthLayout>
  );
}

// ─── Étape 1 : connexion ─────────────────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

function FormLogin({ onOublie }: { onOublie: () => void }) {
  const { login } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      await login(data.email, data.password);
      const me = await api.get('/auth/me');
      router.replace(me.data.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard');
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Input
        label="Adresse email"
        type="email"
        placeholder="Votre adresse email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <div className="relative">
        <Input
          label="Mot de passe"
          type={visible ? 'text' : 'password'}
          placeholder="••••••••"
          autoComplete="current-password"
          className="pr-11"
          error={errors.password?.message}
          {...register('password')}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className="absolute right-3 top-[2.15rem] text-slate-400 transition-colors hover:text-slate-600"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onOublie}
          className="text-xs font-semibold text-blue-700 transition-colors hover:text-blue-900"
        >
          Mot de passe oublié ?
        </button>
      </div>

      <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
        Se connecter
      </Button>
    </form>
  );
}

// ─── Étape 2 : demande du code ───────────────────────────────────────────────
const emailSchema = z.object({ email: z.string().email('Email invalide') });

function FormEmail({ onRetour, onEnvoye }: {
  onRetour: () => void;
  onEnvoye: (email: string) => void;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) });

  const onSubmit = async (data: z.infer<typeof emailSchema>) => {
    try {
      await api.post('/auth/forgot-password', data);
      toast.success('Si cette adresse correspond à un compte, un code vient d\'être envoyé.');
      onEnvoye(data.email);
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Input
        label="Adresse email"
        type="email"
        placeholder="Votre adresse email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <p className="border-l-2 border-blue-700 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
        Saisissez l&apos;adresse associée à votre compte. Vous recevrez un code
        à 6 chiffres, valable 15 minutes.
      </p>

      <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
        Envoyer le code
      </Button>

      <button
        type="button"
        onClick={onRetour}
        className="text-sm text-slate-500 transition-colors hover:text-slate-800"
      >
        Retour à la connexion
      </button>
    </form>
  );
}

// ─── Étape 3 : code + nouveau mot de passe ───────────────────────────────────
const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Le code comporte 6 chiffres'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  password_confirmation: z.string(),
}).refine(d => d.password === d.password_confirmation, {
  message: 'Les mots de passe ne correspondent pas.',
  path: ['password_confirmation'],
});

function FormCode({ email, onRetour }: { email: string; onRetour: () => void }) {
  const [renvoiEnCours, setRenvoiEnCours] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<z.infer<typeof codeSchema>>({ resolver: zodResolver(codeSchema) });

  const onSubmit = async (data: z.infer<typeof codeSchema>) => {
    try {
      await api.post('/auth/reset-password', { ...data, email });
      toast.success('Mot de passe réinitialisé. Vous pouvez vous connecter.');
      onRetour();
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  const renvoyerCode = async () => {
    setRenvoiEnCours(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Un nouveau code vient d\'être envoyé.');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setRenvoiEnCours(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" autoComplete="off">
      <p className="border-l-2 border-blue-700 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
        Code envoyé à <span className="font-semibold text-slate-900">{email}</span>.
        Il est valable 15 minutes.
      </p>

      <Input
        label="Code à 6 chiffres"
        inputMode="numeric"
        maxLength={6}
        autoComplete="one-time-code"
        placeholder="000000"
        className="text-center text-xl font-semibold tracking-[0.5em]"
        error={errors.code?.message}
        {...register('code')}
      />
      <Input
        label="Nouveau mot de passe"
        type="password"
        placeholder="••••••••"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Input
        label="Confirmer le mot de passe"
        type="password"
        placeholder="••••••••"
        autoComplete="new-password"
        error={errors.password_confirmation?.message}
        {...register('password_confirmation')}
      />

      <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
        Réinitialiser
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={renvoyerCode}
          disabled={renvoiEnCours}
          className="font-semibold text-blue-700 transition-colors hover:text-blue-900 disabled:text-slate-400"
        >
          {renvoiEnCours ? 'Envoi…' : 'Renvoyer un code'}
        </button>
        <button
          type="button"
          onClick={onRetour}
          className="text-slate-500 transition-colors hover:text-slate-800"
        >
          Retour à la connexion
        </button>
      </div>
    </form>
  );
}

// ─── Icônes ──────────────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-4 w-4">
      <path d="M10 4C5.5 4 2 10 2 10s3.5 6 8 6 8-6 8-6-3.5-6-8-6zm0 10a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-4 w-4">
      <path d="M3.7 2.3L2.3 3.7l2.6 2.6C3.2 7.7 2 10 2 10s3.5 6 8 6c1.6 0 3-.5 4.2-1.1l2.1 2.1 1.4-1.4L3.7 2.3zM10 14a4 4 0 01-3.5-6l1.6 1.6a2 2 0 002.4 2.4l1.6 1.6c-.6.3-1.3.4-2.1.4zm0-8c4.5 0 8 6 8 6s-.8 1.5-2.3 3l-1.4-1.4A12 12 0 0015.7 10C14.8 8.7 12.7 6 10 6c-.3 0-.6 0-.9.1L7.7 4.6C8.4 4.2 9.2 4 10 4z" />
    </svg>
  );
}
