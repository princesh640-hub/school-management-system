'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  activeCampusId?: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (token: string, userData?: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setUser({
          id: data.id,
          email: data.email,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          organizationId: data.organizationId || (data.organization ? data.organization.id : ''),
          activeCampusId: data.activeCampusId || data.campusId || (data.campus ? data.campus.id : undefined),
          roles: data.roles || [],
          permissions: data.permissions || [],
        });
      } else {
        if (!sessionStorage.getItem('demo_mode')) {
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('auth_user');
          setUser(null);
        }
      }
    } catch {
      if (!sessionStorage.getItem('demo_mode')) {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('auth_user');
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    const cachedUser = typeof window !== 'undefined' ? sessionStorage.getItem('auth_user') : null;
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch {}
    }
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (token: string, userData?: Partial<UserProfile>) => {
    sessionStorage.setItem('access_token', token);
    const profile: UserProfile = {
      id: userData?.id || 'usr-eval',
      email: userData?.email || 'admin@school.edu',
      firstName: userData?.firstName || 'Admin',
      lastName: userData?.lastName || 'Portal',
      organizationId: userData?.organizationId || 'org-1',
      activeCampusId: userData?.activeCampusId,
      roles: userData?.roles || ['SUPER_ADMIN'],
      permissions: userData?.permissions || ['*'],
    };
    setUser(profile);
    sessionStorage.setItem('auth_user', JSON.stringify(profile));
    await fetchCurrentUser(token);
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on logout
    }
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('auth_user');
    sessionStorage.removeItem('demo_mode');
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const refreshUser = async () => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      isLoading: false,
      login: async () => {},
      logout: async () => {},
      refreshUser: async () => {},
    };
  }
  return context;
}
