'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import toast from '@/lib/toast';

interface ResetForm {
  password: string;
  confirmPassword: string;
}

function ResetPasswordInner() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetForm>();
  const password = watch('password', '');

  const rules = [
    { label: '8 caractères ou plus', met: password.length >= 8 },
    { label: 'Une majuscule', met: /[A-Z]/.test(password) },
    { label: 'Une minuscule', met: /[a-z]/.test(password) },
    { label: 'Un caractère spécial', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    { label: 'Un chiffre', met: /\d/.test(password) },
  ];

  const onSubmit = async (data: ResetForm) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await auth.resetPassword({ token, password: data.password });
      toast.success('Mot de passe réinitialisé. Vous pouvez vous connecter.');
      router.push('/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(message || 'Lien invalide ou expiré');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Lien invalide</h1>
        <p className="text-slate-500">Ce lien de réinitialisation est invalide ou a expiré.</p>
        <Link href="/forgot-password" className="inline-block mt-5 text-sm text-slate-900 font-medium underline underline-offset-4 hover:text-indigo-600 transition-colors">
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8">
        <Link
          href="/"
          aria-label="Retour à l'accueil"
          className="inline-flex w-10 h-10 bg-slate-900 rounded-lg items-center justify-center mb-6 transition-transform hover:scale-105 active:scale-95"
        >
          <span className="text-white font-bold text-lg">W</span>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Nouveau mot de passe</h1>
        <p className="text-slate-500 mt-1">Choisissez un nouveau mot de passe pour votre compte.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700">Mot de passe</label>
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPassword ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            {...register('password', { required: 'Le mot de passe est obligatoire', minLength: { value: 8, message: '8 caractères minimum' } })}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {rules.map((rule) => (
            <div key={rule.label} className="flex items-center gap-1.5">
              {rule.met ? <Check size={12} className="text-emerald-500" /> : <X size={12} className="text-slate-300" />}
              <span className={`text-xs ${rule.met ? 'text-emerald-600' : 'text-slate-400'}`}>{rule.label}</span>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Confirmer le mot de passe</label>
          <input
            type={showPassword ? 'text' : 'password'}
            {...register('confirmPassword', {
              required: 'Veuillez confirmer le mot de passe',
              validate: (value) => value === password || 'Les mots de passe ne correspondent pas',
            })}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
          />
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'En cours...' : 'Réinitialiser le mot de passe'}
        </button>
      </form>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
