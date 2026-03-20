'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import AuthLayout from '@/components/auth/AuthLayout';

interface InviteForm {
  firstName: string;
  lastName: string;
  password: string;
}

export default function InvitePage() {
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { register, handleSubmit, watch, formState: { errors } } = useForm<InviteForm>();
  const password = watch('password', '');

  const rules = [
    { label: '8 or more characters', met: password.length >= 8 },
    { label: 'One uppercase', met: /[A-Z]/.test(password) },
    { label: 'One lowercase', met: /[a-z]/.test(password) },
    { label: 'One special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    { label: 'One number', met: /\d/.test(password) },
  ];

  const onSubmit = async (data: InviteForm) => {
    console.log('Accept invite:', { ...data, token });
    // TODO: connect to API
  };

  if (!token) {
    return (
      <AuthLayout imagePosition="right">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Invite</h1>
          <p className="text-slate-500">This invite link is invalid or has expired.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout imagePosition="right">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo */}
        <div className="mb-8">
          <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center mb-6">
            <span className="text-white font-bold text-lg">W</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Join your team</h1>
          <p className="text-slate-500 mt-1">
            You&apos;ve been invited to join an organization. Set up your account below.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input
                {...register('firstName', { required: 'Required' })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                placeholder="Sara"
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                {...register('lastName', { required: 'Required' })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                placeholder="Boughdiri"
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password', { required: 'Password is required' })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          {/* Password Rules */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {rules.map((rule) => (
              <div key={rule.label} className="flex items-center gap-1.5">
                {rule.met ? (
                  <Check size={12} className="text-emerald-500" />
                ) : (
                  <X size={12} className="text-slate-300" />
                )}
                <span className={`text-xs ${rule.met ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {rule.label}
                </span>
              </div>
            ))}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-2.5 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-colors mt-2"
          >
            Join organization
          </button>
        </form>
      </motion.div>
    </AuthLayout>
  );
}
