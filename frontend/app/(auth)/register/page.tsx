'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth';
import { getPlan, type BillingCycle } from '@/lib/plans';
import toast from '@/lib/toast';

interface RegisterForm {
  tenantName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  addressLine: string;
  postalCode: string;
  city: string;
  country: string;
}

function RegisterInner() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();
  const password = watch('password', '');

  // Paid-plan funnel: /register?plan=pro&billing=monthly → after signup, go to
  // checkout for that plan instead of the dashboard.
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan');
  const cycle: BillingCycle = searchParams.get('billing') === 'annual' ? 'annual' : 'monthly';
  const selectedPlan = getPlan(planId);
  const paidPlan = selectedPlan && selectedPlan.id !== 'free' ? selectedPlan : undefined;
  const redirectTo = paidPlan ? `/checkout?plan=${paidPlan.id}&billing=${cycle}` : undefined;

  const rules = [
    { label: '8 caractères ou plus', met: password.length >= 8 },
    { label: 'Une majuscule', met: /[A-Z]/.test(password) },
    { label: 'Une minuscule', met: /[a-z]/.test(password) },
    { label: 'Un caractère spécial', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    { label: 'Un chiffre', met: /\d/.test(password) },
  ];

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      await registerUser(data, redirectTo);
      toast.success('Compte créé avec succès');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(message || 'Échec de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

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
          <span className="text-white font-bold text-lg">B</span>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Bienvenue sur Build withUs Template Builder</h1>
        <p className="text-slate-500 mt-1">
          Vous avez déjà un compte ?{' '}
          <Link href="/login" className="text-slate-900 font-medium underline underline-offset-4 hover:text-indigo-600 transition-colors">
            Se connecter
          </Link>
        </p>

        {paidPlan && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <span className="text-slate-500">Vous vous inscrivez pour&nbsp;</span>
            <span className="font-semibold text-slate-900">Build withUs {paidPlan.name}</span>
            <span className="text-slate-500"> — paiement à l&apos;étape suivante.</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l&apos;organisation</label>
          <input
            {...register('tenantName', { required: 'Le nom de l\'organisation est obligatoire' })}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            placeholder="Build withUs"
          />
          {errors.tenantName && <p className="text-red-500 text-xs mt-1">{errors.tenantName.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
            <input
              {...register('firstName', { required: 'Obligatoire' })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              placeholder="Aziz"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
            <input
              {...register('lastName', { required: 'Obligatoire' })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              placeholder="Said"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
          <input
            type="email"
            {...register('email', { required: 'L\'e-mail est obligatoire', pattern: { value: /^\S+@\S+$/i, message: 'E-mail invalide' } })}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            placeholder="aziz@buildwithus.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
          <input
            type="tel"
            {...register('phone', { required: 'Le téléphone est obligatoire' })}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            placeholder="+33 6 12 34 56 78"
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
          <input
            {...register('addressLine', { required: 'L\'adresse est obligatoire' })}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            placeholder="12 rue de la Paix"
          />
          {errors.addressLine && <p className="text-red-500 text-xs mt-1">{errors.addressLine.message}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Code postal</label>
            <input
              {...register('postalCode', { required: 'Obligatoire' })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              placeholder="75002"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ville</label>
            <input
              {...register('city', { required: 'Obligatoire' })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              placeholder="Paris"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pays</label>
            <input
              {...register('country', { required: 'Obligatoire' })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              placeholder="France"
              defaultValue="France"
            />
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
          {isLoading ? 'Création du compte...' : 'Créer un compte'}
        </button>

        <p className="text-center text-sm text-slate-500">
          Vous avez déjà un compte ?{' '}
          <Link href="/login" className="text-slate-900 font-medium underline underline-offset-4 hover:text-indigo-600 transition-colors">
            Se connecter
          </Link>
        </p>
      </form>
    </motion.div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterInner />
    </Suspense>
  );
}