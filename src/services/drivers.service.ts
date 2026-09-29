import { Driver, Zone } from '@/types';

export interface DriversService {
  getCurrentDriver(): Promise<Driver>;
  getDriverZones(): Promise<Zone[]>;
  updateDriverStatus(status: 'active' | 'on_duty' | 'off_duty'): Promise<Driver>;
}

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? 300 + Math.random() * 250));

export const tunisianZones: Zone[] = [
  { id: 'zone-benarous', name: 'Zone Ben Arous', code: 'BA-01' },
  { id: 'zone-tunis', name: 'Zone Tunis Centre', code: 'TN-01' },
  { id: 'zone-nabeul', name: 'Zone Nabeul / Hammamet', code: 'NB-01' },
  { id: 'zone-sousse', name: 'Zone Sousse Ville', code: 'SS-01' },
];

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
    return { ...this.currentDriver };
  }

  async getDriverZones(): Promise<Zone[]> {
    await delay(200);
    return [...tunisianZones];
  }

  async updateDriverStatus(status: 'active' | 'on_duty' | 'off_duty'): Promise<Driver> {
    await delay();
    this.currentDriver = {
      ...this.currentDriver,
      status,
    };
    return { ...this.currentDriver };
  }
}

export const mockDriversService = new MockDriversService();
export const driversService: DriversService = mockDriversService;
