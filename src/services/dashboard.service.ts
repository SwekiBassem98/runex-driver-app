import { DashboardStats } from '@/types';
import { runsheetsService } from './runsheets.service';

export interface DashboardService {
  getTodayStats(): Promise<DashboardStats>;
  getDashboardStats(): Promise<DashboardStats>;
}

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? 250 + Math.random() * 250));

class MockDashboardService implements DashboardService {
  async getDashboardStats(): Promise<DashboardStats> {
    await delay();

    const runsheet = await runsheetsService.getActiveRunsheet();
    const parcels = runsheet.parcels;

    let inTransit = 0;
    let delivered = 0;
    let reported = 0;
    let returned = 0;
    let relaunches = 0;
    let cashCollected = 0;

    for (const p of parcels) {
      switch (p.status) {
        case 'in_transit':
        case 'assigned':
        case 'pending':
          inTransit++;
          break;
        case 'delivered':
        case 'partially_delivered':
          delivered++;
          // Montant réellement encaissé (API) ; à défaut, le montant du colis.
          cashCollected += p.collectedAmount ?? p.codAmount ?? 0;
          break;
        case 'postponed':
          reported++;
          break;
        case 'returned':
        case 'cancelled':
          returned++;
          break;
        case 'exchanged':
          relaunches++;
          break;
      }
    }

    return {
      totalParcels: parcels.length,
      inTransit,
      delivered,
      reported,
      returned,
      relaunches,
      cashCollected: Number(cashCollected.toFixed(3)),
    };
  }

  async getTodayStats(): Promise<DashboardStats> {
    return this.getDashboardStats();
  }
}

export const mockDashboardService = new MockDashboardService();
export const dashboardService: DashboardService = mockDashboardService;
