import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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

// Keys to clear from localStorage on logout so one user's session
// never bleeds into another user's session on the same device.
const SESSION_STORAGE_KEYS = [
  'token',
  'attendx_active_squad_id',
  'attendx_prompt_squad_selection',
  'attendx_is_overall_view',
];

/** Clears all per-user squad-last-visited keys (attendx_last_squad_<userId>) */
function clearUserSpecificKeys() {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith('attendx_last_squad_')) keysToRemove.push(key);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const doLogout = useCallback(() => {
    // Clear React Query cache so previous user's data is never shown to next user
    queryClient.clear();
    // Clear all session-related localStorage keys
    SESSION_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
    clearUserSpecificKeys();
    setUser(null);
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data);
    } catch {
      doLogout();
    }
  }, [doLogout]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  // Handle session expiry on Capacitor Android (dispatched by api.ts interceptor)
  useEffect(() => {
    const handleSessionExpired = () => {
      doLogout();
      // Use React state change — the ProtectedRoute will redirect to /login automatically
    };
    window.addEventListener('attendx:session-expired', handleSessionExpired);
    return () => window.removeEventListener('attendx:session-expired', handleSessionExpired);
  }, [doLogout]);

  const login = (token: string, userData: AuthUser) => {
    // Clear any previous user's cache before loading new user
    queryClient.clear();
    // Clear previous user's session keys (squad selections, etc.)
    SESSION_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
    clearUserSpecificKeys();

    localStorage.setItem('token', token);
    if (['ADMIN', 'COACH', 'SPORTS_OFFICER'].includes(userData.role)) {
      localStorage.setItem('attendx_prompt_squad_selection', 'true');
    }
    setUser(userData);
  };

  const logout = () => {
    doLogout();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
