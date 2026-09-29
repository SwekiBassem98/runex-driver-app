import { create } from 'zustand';
import { DriverProfile, Parcel, ParcelStatus, Pickup, RunsheetSummary } from '@/types';
import { driverApi } from '@/services/api';

interface AppState {
  // State
  profile: DriverProfile | null;
  parcels: Parcel[];
  pickups: Pickup[];
  runsheetSummary: RunsheetSummary;
  selectedZone: string | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadInitialData: () => Promise<void>;
  setSelectedZone: (zoneId: string | null) => void;
  setSearchQuery: (query: string) => void;
  updateParcelStatus: (id: string, status: ParcelStatus) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  parcels: [],
  pickups: [],
  runsheetSummary: {
    totalParcels: 0,
    inDelivery: 0,
    delivered: 0,
    postponed: 0,
    returned: 0,
    relanced: 0,
    cashCollectedTND: 0,
  },
  selectedZone: null,
  searchQuery: '',
  isLoading: false,
  error: null,

  loadInitialData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [profile, summary, parcels, pickups] = await Promise.all([
        driverApi.getProfile(),
        driverApi.getRunsheetSummary(),
        driverApi.getParcels(),
        driverApi.getPickups(),
      ]);
      set({
        profile,
        runsheetSummary: summary,
        parcels,
        pickups,
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

  updateParcelStatus: async (id: string, status: ParcelStatus) => {
    try {
      await driverApi.updateParcelStatus(id, status);
      const { parcels } = get();
      const updated = parcels.map((p) => (p.id === id ? { ...p, status } : p));
      set({ parcels: updated });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update status' });
    }
  },
}));
