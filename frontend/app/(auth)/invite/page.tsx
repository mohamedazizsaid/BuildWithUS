'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/auth/AuthLayout';

interface InviteForm {
  firstName: string;
  lastName: string;
  password: string;
}

export default function InvitePage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { acceptInvite } = useAuth();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<InviteForm>();
  const password = watch('password', '');

  const rules = [
    { label: '8 caractères ou plus', met: password.length >= 8 },
    { label: 'Une majuscule', met: /[A-Z]/.test(password) },
    { label: 'Une minuscule', met: /[a-z]/.test(password) },
    { label: 'Un caractère spécial', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    { label: 'Un chiffre', met: /\d/.test(password) },
  ];

  const onSubmit = async (data: InviteForm) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await acceptInvite({ ...data, token });
      toast.success('Bienvenue dans l\'équipe !');
    } catch (error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : "Échec de l'invitation";

  toast.error(message);
} finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Invitation invalide</h1>
        <p className="text-slate-500">Ce lien d&apos;invitation est invalide ou a expiré.</p>
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
        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center mb-6">
          <span className="text-white font-bold text-lg">W</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Rejoignez votre équipe</h1>
        <p className="text-slate-500 mt-1">
          Vous avez été invité à rejoindre une organisation. Configurez votre compte ci-dessous.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
            <input
              {...register('firstName', { required: 'Obligatoire' })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              placeholder="Sara"
            />
            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
            <input
              {...register('lastName', { required: 'Obligatoire' })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              placeholder="Boughdiri"
            />
            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
          </div>
        </div>

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
            {...register('password', { required: 'Le mot de passe est obligatoire' })}
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'En cours...' : 'Rejoindre l\'organisation'}
        </button>
      </form>
    </motion.div>
  );
}
