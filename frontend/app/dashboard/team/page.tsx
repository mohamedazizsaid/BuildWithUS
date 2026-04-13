'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Mail, Shield, Pencil, Eye } from 'lucide-react';
import { auth } from '@/lib/api';
import { useAuth } from '@/context/auth';
import toast from 'react-hot-toast';

interface Member {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Shield }> = {
  admin:  { label: 'Admin',    color: 'text-purple-700', bg: 'bg-purple-50',  icon: Shield },
  editor: { label: 'Éditeur',  color: 'text-blue-700',   bg: 'bg-blue-50',    icon: Pencil },
  viewer: { label: 'Lecteur',  color: 'text-slate-600',  bg: 'bg-slate-100',  icon: Eye },
};

function getRoleConfig(role: string) {
  return ROLE_CONFIG[role.toLowerCase()] ?? ROLE_CONFIG['viewer'];
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.charAt(0) ?? ''}${lastName?.charAt(0) ?? ''}`.toUpperCase();
}

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500',   'bg-sky-500',     'bg-violet-500',
];

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auth.listMembers()
      .then((data) => setMembers(data.members || []))
      .catch(() => toast.error('Échec du chargement des membres'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold flex items-center gap-2.5">
          <Users size={22} className="text-slate-700" />
          Membres de l&apos;équipe
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {members.length} membre{members.length !== 1 ? 's' : ''} dans <span className="font-medium text-foreground">{user?.tenant_name}</span>
        </p>
      </motion.div>

      {/* Members list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
              <Users size={24} className="text-slate-400" />
            </div>
            <p className="font-medium text-slate-700">Aucun membre</p>
            <p className="text-sm text-slate-400 mt-1">Invitez des membres depuis le menu d&apos;administration</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {members.map((member, i) => {
              const role = getRoleConfig(member.role);
              const RoleIcon = role.icon;
              const isMe = member.id === user?.id;

              return (
                <motion.li
                  key={member.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full ${avatarColor(member.id)} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-sm font-semibold">
                      {getInitials(member.first_name, member.last_name)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {member.first_name} {member.last_name}
                      </p>
                      {isMe && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          Vous
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Mail size={11} className="text-slate-400" />
                      <p className="text-xs text-slate-500 truncate">{member.email}</p>
                    </div>
                  </div>

                  {/* Role badge */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${role.bg} ${role.color} flex-shrink-0`}>
                    <RoleIcon size={11} />
                    {role.label}
                  </span>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
