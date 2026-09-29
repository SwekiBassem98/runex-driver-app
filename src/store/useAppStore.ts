import { create } from 'zustand';
import { Driver, Parcel, Ramassage, DashboardStats, Runsheet } from '@/types';
import { driversService, dashboardService, runsheetsService, ramassagesService } from '@/services';

interface AppState {
  // State
  profile: Driver | null;
  activeRunsheet: Runsheet | null;
  parcels: Parcel[];
  ramassages: Ramassage[];
  dashboardStats: DashboardStats;
  selectedZone: string | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadInitialData: () => Promise<void>;
  setSelectedZone: (zoneId: string | null) => void;
  setSearchQuery: (query: string) => void;
  deliverParcel: (parcelId: string, notes?: string) => Promise<void>;
  returnParcel: (parcelId: string, reason: string, notes?: string) => Promise<void>;
  postponeParcel: (parcelId: string, reason: string) => Promise<void>;
  confirmRamassage: (ramassageId: string, notes?: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  activeRunsheet: null,
  parcels: [],
  ramassages: [],
  dashboardStats: {
    totalParcels: 0,
    inTransit: 0,
    delivered: 0,
    reported: 0,
    returned: 0,
    relaunches: 0,
    cashCollected: 0,
  },
  selectedZone: null,
  searchQuery: '',
  isLoading: false,
  error: null,

  loadInitialData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [profile, stats, runsheet, ramassages] = await Promise.all([
        driversService.getCurrentDriver(),
        dashboardService.getDashboardStats(),
        runsheetsService.getActiveRunsheet(),
        ramassagesService.getRamassages(),
      ]);

      set({
        profile,
        dashboardStats: stats,
        activeRunsheet: runsheet,
        parcels: runsheet.parcels,
        ramassages,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },

  setSelectedZone: (zoneId: string | null) => {
    set({ selectedZone: zoneId });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  deliverParcel: async (parcelId: string, notes?: string) => {
    try {
      const updated = await runsheetsService.deliverParcel(parcelId, { notes });
      const { parcels } = get();
      set({
        parcels: parcels.map((p) => (p.id === parcelId ? updated : p)),
      });
      // Refresh stats
      const stats = await dashboardService.getDashboardStats();
      set({ dashboardStats: stats });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Échec de la livraison' });
      throw err;
    }
  },

  returnParcel: async (parcelId: string, reason: string, notes?: string) => {
    try {
      const updated = await runsheetsService.returnParcel(parcelId, { reason, notes });
      const { parcels } = get();
      set({
        parcels: parcels.map((p) => (p.id === parcelId ? updated : p)),
      });
      const stats = await dashboardService.getDashboardStats();
      set({ dashboardStats: stats });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Échec du retour' });
      throw err;
    }
  },

  postponeParcel: async (parcelId: string, reason: string) => {
    try {
      const updated = await runsheetsService.postponeParcel(parcelId, { reason });
      const { parcels } = get();
      set({
        parcels: parcels.map((p) => (p.id === parcelId ? updated : p)),
      });
      const stats = await dashboardService.getDashboardStats();
      set({ dashboardStats: stats });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Échec du report' });
      throw err;
    }
  },

  confirmRamassage: async (ramassageId: string, notes?: string) => {
    try {
      const updated = await ramassagesService.confirmRamassage(ramassageId, { notes });
      const { ramassages } = get();
      set({
        ramassages: ramassages.map((r) => (r.id === ramassageId ? updated : r)),
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Échec de confirmation' });
      throw err;
    }
  },
}));
