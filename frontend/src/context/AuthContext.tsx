import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

import { Capacitor } from '@capacitor/core';

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
  'attendx_user',
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
  // Initialize user synchronously from localStorage so UI is instant and doesn't flicker or flash login
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const token = localStorage.getItem('token');
      const saved = localStorage.getItem('attendx_user');
      if (token && saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore parse error
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    // If we already have token and cached user, we are ready to display UI immediately
    return !localStorage.getItem('token');
  });

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
      localStorage.setItem('attendx_user', JSON.stringify(res.data.data));
    } catch (err: any) {
      // ONLY logout if explicitly unauthorized (401 or 403)
      if (err.response?.status === 401 || err.response?.status === 403) {
        doLogout();
      }
      // For network errors, timeouts, or server cold starts, keep the persisted session!
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

  // Handle Android resume lifecycle: re-verify session in background without clearing state on network blip
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cleanup: (() => void) | null = null;
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive && localStorage.getItem('token')) {
          refreshUser();
        }
      }).then(handle => {
        cleanup = () => handle.remove();
      });
    }).catch(() => {});

    return () => {
      if (cleanup) cleanup();
    };
  }, [refreshUser]);

  // Handle session expiry on Capacitor Android (dispatched by api.ts interceptor)
  useEffect(() => {
    const handleSessionExpired = () => {
      doLogout();
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
    localStorage.setItem('attendx_user', JSON.stringify(userData));
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
