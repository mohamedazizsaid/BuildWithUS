'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/context/auth';
import toast from 'react-hot-toast';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Bon retour !');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(message || 'E-mail ou mot de passe invalide');
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
        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center mb-6">
          <span className="text-white font-bold text-lg">W</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Bon retour</h1>
        <p className="text-slate-500 mt-1">
          Vous n&apos;avez pas de compte ?{' '}
          <Link href="/register" className="text-slate-900 font-medium underline underline-offset-4 hover:text-indigo-600 transition-colors">
            S&apos;inscrire
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
          <input
            type="email"
            {...register('email', { required: 'L\'e-mail est obligatoire', pattern: { value: /^\S+@\S+$/i, message: 'E-mail invalide' } })}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            placeholder="ahmed@winaity.com"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
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

        <div className="text-right">
          <button type="button" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            Mot de passe oublié ?
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Connexion...' : 'Se connecter'}
        </button>

        <p className="text-center text-sm text-slate-500">
          Vous n&apos;avez pas de compte ?{' '}
          <Link href="/register" className="text-slate-900 font-medium underline underline-offset-4 hover:text-indigo-600 transition-colors">
            S&apos;inscrire
          </Link>
        </p>
      </form>
    </motion.div>
  );
}
