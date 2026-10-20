import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuth } from './AuthContext';

export interface Squad {
  id: string;
  name: string;
  categoryId: string;
  isActive: boolean;
  displayOrder: number;
  category?: Category;
  _count?: { players: number; sessions?: number };
}

export interface Category {
  id: string;
  name: string;
  sportId: string;
  isActive: boolean;
  displayOrder: number;
  sport?: Sport;
  squads: Squad[];
}

export interface Sport {
  id: string;
  name: string;
  accentColor: string;
  isActive: boolean;
  displayOrder: number;
  categories: Category[];
}

interface SquadContextType {
  sports: Sport[];
  allSquads: Squad[];
  activeSquad: Squad | null;
  activeSport: Sport | null;
  activeCategory: Category | null;
  accentColor: string;
  isOverallView: boolean;
  isSelectorOpen: boolean;
  openSelector: () => void;
  closeSelector: () => void;
  setIsOverallView: (val: boolean) => void;
  setActiveSquadId: (squadId: string) => void;
  refreshSports: () => Promise<void>;
  loading: boolean;
}

const SquadContext = createContext<SquadContextType>({} as SquadContextType);

// Helper to convert hex to rgb string like "249, 115, 22"
function hexToRgb(hex: string): string {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return '249, 115, 22';
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

export function SquadProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [sports, setSports] = useState<Sport[]>([]);
  const [activeSquadId, setActiveSquadIdState] = useState<string | null>(null);
  const [isOverallView, setIsOverallViewState] = useState<boolean>(false);
  const [isSelectorOpen, setIsSelectorOpenState] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Flattened list of squads with parents attached
  const allSquads = useMemo(() => {
    const list: Squad[] = [];
    for (const sport of sports) {
      for (const cat of sport.categories || []) {
        for (const sq of cat.squads || []) {
          list.push({
            ...sq,
            category: {
              ...cat,
              sport,
            },
          });
        }
      }
    }
    return list;
  }, [sports]);

  // Fetch sports hierarchy from backend
  const refreshSports = useCallback(async () => {
    try {
      const res = await api.get('/sports');
      if (res.data.success && Array.isArray(res.data.data)) {
        setSports(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch sports hierarchy:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      refreshSports().finally(() => setLoading(false));
    } else {
      setSports([]);
      setActiveSquadIdState(null);
      setIsOverallViewState(false);
      setIsSelectorOpenState(false);
      setLoading(false);
    }
  }, [user, refreshSports]);

  // Determine active squad based on user role and saved state
  useEffect(() => {
    if (!user || allSquads.length === 0) return;

    // Players and Captains are strictly locked to their assigned squad
    if (user.role === 'PLAYER' || user.role === 'CAPTAIN') {
      const playerSquadId = (user as any).squadId || (user as any).squad?.id;
      if (playerSquadId) {
        setActiveSquadIdState(playerSquadId);
        localStorage.setItem('attendx_active_squad_id', playerSquadId);
      }
      setIsOverallViewState(false);
      setIsSelectorOpenState(false);
      return;
    }

    // For Admin, Coach, Sports Officer: restore last valid selected squad or prompt on login
    const shouldPrompt = localStorage.getItem('attendx_prompt_squad_selection') === 'true';
    const savedSquadId = localStorage.getItem(`attendx_last_squad_${user.id}`) ||
                         localStorage.getItem('attendx_active_squad_id');

    if (savedSquadId && allSquads.some(s => s.id === savedSquadId)) {
      setActiveSquadIdState(savedSquadId);
      localStorage.setItem('attendx_active_squad_id', savedSquadId);
    } else {
      const firstActive = allSquads.find(s => s.isActive) || allSquads[0];
      if (firstActive) {
        setActiveSquadIdState(firstActive.id);
        localStorage.setItem('attendx_active_squad_id', firstActive.id);
      }
    }

    if (shouldPrompt || !savedSquadId || !allSquads.some(s => s.id === savedSquadId)) {
      setIsSelectorOpenState(true);
      localStorage.removeItem('attendx_prompt_squad_selection');
    }
  }, [user, allSquads]);

  // Derive active squad, sport, category
  const activeSquad = useMemo(() => {
    if (!activeSquadId) return null;
    return allSquads.find(s => s.id === activeSquadId) || null;
  }, [activeSquadId, allSquads]);

  const activeCategory = activeSquad?.category || null;
  const activeSport = activeCategory?.sport || null;
  const accentColor = activeSport?.accentColor || '#f97316';

  // Apply dynamic CSS accent color variables to root document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--sport-accent', accentColor);
      document.documentElement.style.setProperty('--sport-accent-rgb', hexToRgb(accentColor));
    }
  }, [accentColor]);

  // Switch active squad
  const setActiveSquadId = useCallback((squadId: string) => {
    if (user?.role === 'PLAYER' || user?.role === 'CAPTAIN') return; // restricted
    setActiveSquadIdState(squadId);
    setIsOverallViewState(false);
    setIsSelectorOpenState(false);
    localStorage.setItem('attendx_active_squad_id', squadId);
    if (user) {
      localStorage.setItem(`attendx_last_squad_${user.id}`, squadId);
    }
    // Invalidate all queries to refresh UI with fresh squad data
    queryClient.invalidateQueries();
  }, [user, queryClient]);

  const setIsOverallView = useCallback((val: boolean) => {
    if (user?.role !== 'ADMIN') return;
    setIsOverallViewState(val);
    setIsSelectorOpenState(false);
    queryClient.invalidateQueries();
  }, [user, queryClient]);

  const openSelector = useCallback(() => {
    if (user && ['ADMIN', 'COACH', 'SPORTS_OFFICER'].includes(user.role)) {
      setIsSelectorOpenState(true);
    }
  }, [user]);

  const closeSelector = useCallback(() => {
    setIsSelectorOpenState(false);
  }, []);

  return (
    <SquadContext.Provider
      value={{
        sports,
        allSquads,
        activeSquad,
        activeSport,
        activeCategory,
        accentColor,
        isOverallView,
        isSelectorOpen,
        openSelector,
        closeSelector,
        setIsOverallView,
        setActiveSquadId,
        refreshSports,
        loading,
      }}
    >
      {children}
    </SquadContext.Provider>
  );
}

export const useSquad = () => useContext(SquadContext);
