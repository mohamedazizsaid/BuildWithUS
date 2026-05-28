'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, isEmbedMode, getEmbedToken, decodeJwtPayload } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  tenant_id: string;
  tenant_name: string;
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

  // On app load, check if user is already logged in (cookie exists).
  // In embed mode we have no cookie session — we have an M2M JWT. Stub a
  // user object from the JWT claims so the dashboard chrome can render
  // without needing /auth/me to succeed.
  useEffect(() => {
    if (isEmbedMode()) {
      const tok = getEmbedToken();
      const claims = tok ? decodeJwtPayload(tok) : null;
      const tenantId = (claims?.tenantId ?? claims?.tenant_id ?? claims?.sub ?? '') as string;
      const tokenType = (claims?.type ?? '') as string;
      const isIntegrationSession = tokenType === 'integration_session';
      setUser({
        id: isIntegrationSession ? 'integration-session' : 'embed-m2m',
        tenant_id: tenantId,
        tenant_name: isIntegrationSession ? 'Session intégration' : 'Embedded session',
        email: isIntegrationSession ? '' : 'embed@m2m',
        first_name: isIntegrationSession ? 'Intégration' : 'Embed',
        last_name: 'Session',
        role: isIntegrationSession ? 'editor' : 'm2m',
      });
      setLoading(false);
      return;
    }
    auth.getMe()
      .then((data) => setUser({ ...data.user, tenant_name: data.tenant_name }))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    await auth.login({ email, password });
    const me = await auth.getMe();
    setUser({ ...me.user, tenant_name: me.tenant_name });
    router.push('/dashboard');
  };

  const register = async (body: { tenantName: string; email: string; password: string; firstName: string; lastName: string }) => {
    await auth.register(body);
    const me = await auth.getMe();
    setUser({ ...me.user, tenant_name: me.tenant_name });
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
