'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/auth';
import { auth } from '@/lib/api';
import { motion } from 'framer-motion';
import { UserPlus, Copy, Check, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface InviteForm {
  email: string;
  role: string;
}

export default function InviteMemberPage() {
  const { user } = useAuth();
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteForm>({
    defaultValues: { role: 'editor' },
  });

  const onSubmit = async (data: InviteForm) => {
    setIsLoading(true);
    setInviteLink('');
    try {
      const result = await auth.invite(data);
      const link = `${window.location.origin}/invite?token=${result.invite.token}`;
      setInviteLink(link);
      toast.success(`Invite sent to ${data.email}`);
      reset();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invite');
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-500">Only admins can invite members.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Invite Member</h1>
          <p className="text-slate-500 mt-1">Invite someone to join {user?.tenant_name}.</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' },
                })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                placeholder="colleague@company.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select
                {...register('role')}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all bg-white"
              >
                <option value="editor">Editor — can create and edit templates</option>
                <option value="member">Member — read-only access</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus size={18} />
              {isLoading ? 'Sending invite...' : 'Send Invite'}
            </button>
          </form>

          {/* Invite Link */}
          {inviteLink && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon size={16} className="text-emerald-600" />
                <p className="text-sm font-medium text-emerald-800">Invite link generated!</p>
              </div>
              <p className="text-xs text-emerald-600 mb-3">Share this link with the person. It expires in 15 minutes.</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs text-slate-700 font-mono"
                />
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
