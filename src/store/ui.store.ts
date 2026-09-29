import { create } from 'zustand';

interface UiState {
  activeZoneFilter: string | null;
  activeStatusFilter: string;
  activeRamassageFilter: string;
  searchQuery: string;

  // Dev & testing toggles for mock layer simulation
  simulateEmptyRunsheet: boolean;
  simulatePermission403Error: boolean;

  // Actions
  setActiveZoneFilter: (zoneId: string | null) => void;
  setActiveStatusFilter: (status: string) => void;
  setActiveRamassageFilter: (status: string) => void;
  setSearchQuery: (query: string) => void;
  setSimulateEmptyRunsheet: (value: boolean) => void;
  setSimulatePermission403Error: (value: boolean) => void;
  resetFilters: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeZoneFilter: null,
  activeStatusFilter: 'all',
  activeRamassageFilter: 'all',
  searchQuery: '',

  // Dev toggles
  simulateEmptyRunsheet: false,
  simulatePermission403Error: true, // Enabled by default to reproduce backend known 403 restriction

  setActiveZoneFilter: (zoneId: string | null) => {
    set({ activeZoneFilter: zoneId });
  },

  setActiveStatusFilter: (status: string) => {
    set({ activeStatusFilter: status });
  },

  setActiveRamassageFilter: (status: string) => {
    set({ activeRamassageFilter: status });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSimulateEmptyRunsheet: (value: boolean) => {
    set({ simulateEmptyRunsheet: value });
  },

  setSimulatePermission403Error: (value: boolean) => {
    set({ simulatePermission403Error: value });
  },

  resetFilters: () => {
    set({
      activeZoneFilter: null,
      activeStatusFilter: 'all',
      activeRamassageFilter: 'all',
      searchQuery: '',
    });
  },
}));
