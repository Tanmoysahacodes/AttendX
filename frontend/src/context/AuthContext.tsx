import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export interface AuthUser {
  id: string;
  name: string;
  role: 'PLAYER' | 'CAPTAIN' | 'COACH' | 'SPORTS_OFFICER' | 'ADMIN';
  status: string;
  jerseyNumber?: string | null;
  username?: string | null;
  position?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = (token: string, userData: AuthUser) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
