import { create } from 'zustand';
import { Driver } from '@/types';

interface AuthState {
  driver: Driver | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setDriver: (driver: Driver | null) => void;
  setAuth: (token: string, refreshToken: string, driver: Driver) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  getToken: () => string | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  driver: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,

  setDriver: (driver: Driver | null) => {
    set({
      driver,
      isAuthenticated: !!driver,
    });
  },

  setAuth: (token: string, refreshToken: string, driver: Driver) => {
    set({
      token,
      refreshToken,
      driver,
      isAuthenticated: true,
    });
  },

  setToken: (token: string | null) => {
    set({
      token,
      isAuthenticated: !!token && !!get().driver,
    });
  },

  logout: () => {
    set({
      driver: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  getToken: () => get().token,
}));
