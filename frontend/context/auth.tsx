'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { tenantName: string; email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  acceptInvite: (data: { token: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // On app load, check if user is already logged in (cookie exists)
  useEffect(() => {
    auth.getMe()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await auth.login({ email, password });
    setUser(data.user);
    router.push('/dashboard');
  };

  const register = async (body: { tenantName: string; email: string; password: string; firstName: string; lastName: string }) => {
    const data = await auth.register(body);
    setUser(data.user);
    router.push('/dashboard');
  };

  const acceptInvite = async (body: { token: string; password: string; firstName: string; lastName: string }) => {
    const data = await auth.acceptInvite(body);
    setUser(data.user);
    router.push('/dashboard');
  };

  const logout = async () => {
    await auth.logout();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, acceptInvite, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
