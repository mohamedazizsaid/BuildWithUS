'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface RegisterForm {
  tenantName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();
  const password = watch('password', '');

  const rules = [
    { label: '8 or more characters', met: password.length >= 8 },
    { label: 'One uppercase', met: /[A-Z]/.test(password) },
    { label: 'One lowercase', met: /[a-z]/.test(password) },
    { label: 'One special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    { label: 'One number', met: /\d/.test(password) },
  ];

  const onSubmit = async (data: RegisterForm) => {
    console.log('Register:', data);
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
        <h1 className="text-2xl font-bold text-slate-900">Welcome to Winaity</h1>
        <p className="text-slate-500 mt-1">
          Already have an account?{' '}
          <Link href="/login" className="text-slate-900 font-medium underline underline-offset-4 hover:text-indigo-600 transition-colors">
            Log in
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
          <input
            {...register('tenantName', { required: 'Organization name is required' })}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            placeholder="Winaity"
          />
          {errors.tenantName && <p className="text-red-500 text-xs mt-1">{errors.tenantName.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
            <input
              {...register('firstName', { required: 'Required' })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              placeholder="Ahmed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
            <input
              {...register('lastName', { required: 'Required' })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              placeholder="Boughdiri"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            placeholder="ahmed@winaity.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            {...register('password', { required: 'Password is required' })}
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

        <button type="submit" className="w-full py-2.5 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-colors mt-2">
          Create an account
        </button>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="text-slate-900 font-medium underline underline-offset-4 hover:text-indigo-600 transition-colors">
            Log in
          </Link>
        </p>
      </form>
    </motion.div>
  );
}
