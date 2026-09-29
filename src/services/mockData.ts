import { DriverProfile, Parcel, Pickup, RunsheetSummary } from '@/types';

export const mockDriver: DriverProfile = {
  id: 'drv-001',
  fullName: 'HAMZA MABROUK',
  matricule: '6383 TUN 181',
  phone: '27949967',
  cin: '',
  agency: 'Ben Arous',
  zones: [
    { id: 'z1', name: 'Zone Ben Arous', code: 'BA-01' },
    { id: 'z2', name: 'Zone Rades', code: 'RD-01' },
    { id: 'z3', name: 'Zone Megrine', code: 'MG-01' },
  ],
};

export const mockRunsheetSummary: RunsheetSummary = {
  totalParcels: 0,
  inDelivery: 0,
  delivered: 0,
  postponed: 0,
  returned: 0,
  relanced: 0,
  cashCollectedTND: 0.0,
};

export const mockParcels: Parcel[] = [];

export const mockPickups: Pickup[] = [];
