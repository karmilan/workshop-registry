/* src/AuthContext.tsx */
import { useEffect, useState, type ReactNode } from 'react';
import { apiGet, apiPost } from './api';
import { authStore, type AuthUser } from './auth';
import { AuthContext } from './auth-context';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(Boolean(authStore.getToken()));

  useEffect(() => {
    const token = authStore.getToken();
    if (!token) return undefined;

    let active = true;
    apiGet<{ user: AuthUser }>('/api/auth/me')
      .then((response) => {
        if (active) {
          authStore.setUser(response.user);
          setUser(response.user);
        }
      })
      .catch(() => {
        if (active) {
          authStore.clear();
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const expireSession = () => {
      authStore.clear();
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('auth:expired', expireSession);
    return () => window.removeEventListener('auth:expired', expireSession);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const resp = await apiPost<{ token: string; user: AuthUser }>('/api/auth/login', {
        email,
        password,
      });
      authStore.setToken(resp.token);
      authStore.setUser(resp.user);
      setUser(resp.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
