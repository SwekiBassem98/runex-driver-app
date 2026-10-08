import { Driver, Zone } from '@/types';
import { USE_MOCKS } from '@/config/env';
import { tunisianZones } from './zones';
import { httpDriversService } from './http/drivers.http';
import { useAuthStore } from '@/store/auth.store';

export { tunisianZones };

export interface DriversService {
  getCurrentDriver(): Promise<Driver>;
  getDriverZones(): Promise<Zone[]>;
  getAllZones(): Promise<Zone[]>;
  addDriverZone(zoneId: string): Promise<Driver>;
  removeDriverZone(zoneId: string): Promise<Driver>;
  updateDriverZones(zoneIds: string[]): Promise<Driver>;
  updateDriverStatus(status: 'active' | 'on_duty' | 'off_duty'): Promise<Driver>;
}

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? 300 + Math.random() * 250));

export const mockDriverProfile: Driver = {
  id: 'drv-7701',
  fullName: 'HAMZA MABROUK',
  phone: '27949967',
  cin: '09876543',
  agency: 'Ben Arous',
  matricule: '6383 TUN 181',
  status: 'on_duty',
  zones: tunisianZones.slice(0, 2), // Ben Arous & Tunis assigned
};

class MockDriversService implements DriversService {
  private currentDriver: Driver = { ...mockDriverProfile };

  async getCurrentDriver(): Promise<Driver> {
    await delay();
    const stored = useAuthStore.getState().driver;
    if (stored) {
      this.currentDriver = { ...stored };
    }
    return { ...this.currentDriver };
  }

  async getDriverZones(): Promise<Zone[]> {
    await delay(150);
    return [...this.currentDriver.zones];
  }

  async getAllZones(): Promise<Zone[]> {
    await delay(150);
    return [...tunisianZones];
  }

  async addDriverZone(zoneId: string): Promise<Driver> {
    await delay(200);
    const zoneToAdd = tunisianZones.find((z) => z.id === zoneId);
    if (zoneToAdd && !this.currentDriver.zones.some((z) => z.id === zoneId)) {
      this.currentDriver = {
        ...this.currentDriver,
        zones: [...this.currentDriver.zones, zoneToAdd],
      };
      useAuthStore.getState().setDriver(this.currentDriver);
    }
    return { ...this.currentDriver };
  }

  async removeDriverZone(zoneId: string): Promise<Driver> {
    await delay(200);
    this.currentDriver = {
      ...this.currentDriver,
      zones: this.currentDriver.zones.filter((z) => z.id !== zoneId),
    };
    useAuthStore.getState().setDriver(this.currentDriver);
    return { ...this.currentDriver };
  }

  async updateDriverZones(zoneIds: string[]): Promise<Driver> {
    await delay(200);
    const newZones = tunisianZones.filter((z) => zoneIds.includes(z.id));
    this.currentDriver = {
      ...this.currentDriver,
      zones: newZones,
    };
    useAuthStore.getState().setDriver(this.currentDriver);
    return { ...this.currentDriver };
  }

  async updateDriverStatus(status: 'active' | 'on_duty' | 'off_duty'): Promise<Driver> {
    await delay();
    this.currentDriver = {
      ...this.currentDriver,
      status,
    };
    useAuthStore.getState().setDriver(this.currentDriver);
    return { ...this.currentDriver };
  }
}

export const mockDriversService = new MockDriversService();
export const driversService: DriversService = USE_MOCKS ? mockDriversService : httpDriversService;
