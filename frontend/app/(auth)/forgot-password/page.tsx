'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { auth } from '@/lib/api';
import toast from '@/lib/toast';

interface ForgotForm {
  email: string;
}

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotForm>();

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true);
    try {
      await auth.forgotPassword({ email: data.email });
      setSentTo(data.email);
      setSent(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(message || 'Une erreur est survenue');
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
          <span className="text-white font-bold text-lg">W</span>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Mot de passe oublié ?</h1>
        <p className="text-slate-500 mt-1">
          Saisissez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>
      </div>

      {sent ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MailCheck size={22} className="text-emerald-500" />
          </div>
          <h2 className="text-slate-900 font-semibold">Vérifiez votre boîte mail</h2>
          <p className="text-slate-500 text-sm mt-1">
            Si un compte existe pour <strong>{sentTo}</strong>, vous recevrez un lien de réinitialisation.
            Le lien expire dans 15 minutes.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 mt-5 text-sm text-slate-900 font-medium hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft size={14} />
            Retour à la connexion
          </Link>
        </div>
      ) : (
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
          </button>

          <p className="text-center text-sm text-slate-500">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-slate-900 font-medium hover:text-indigo-600 transition-colors">
              <ArrowLeft size={14} />
              Retour à la connexion
            </Link>
          </p>
        </form>
      )}
    </motion.div>
  );
}
