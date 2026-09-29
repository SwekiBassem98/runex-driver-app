import { DriverProfile, Parcel, ParcelStatus, Pickup, RunsheetSummary } from '@/types';
import { mockDriver, mockParcels, mockPickups, mockRunsheetSummary } from './mockData';

/**
 * Driver API Service
 * Currently using mock data. Replace implementation with real HTTP client (fetch/axios) later.
 */
export const driverApi = {
  async getProfile(): Promise<DriverProfile> {
    return Promise.resolve(mockDriver);
  },

  async getRunsheetSummary(): Promise<RunsheetSummary> {
    return Promise.resolve(mockRunsheetSummary);
  },

  async getParcels(): Promise<Parcel[]> {
    return Promise.resolve(mockParcels);
  },

  async getPickups(): Promise<Pickup[]> {
    return Promise.resolve(mockPickups);
  },

  async updateParcelStatus(
    id: string,
    status: ParcelStatus
  ): Promise<{ success: boolean; id: string; status: ParcelStatus }> {
    return Promise.resolve({ success: true, id, status });
  },

  async searchParcels(query: string, zoneId?: string): Promise<Parcel[]> {
    const q = query.trim().toLowerCase();
    return Promise.resolve(
      mockParcels.filter((p) => {
        const matchesQuery =
          !q ||
          p.trackingNumber.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          p.clientPhone.includes(q);
        const matchesZone = !zoneId || p.zone === zoneId;
        return matchesQuery && matchesZone;
      })
    );
  },
};
