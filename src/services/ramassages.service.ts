import { Ramassage, AppApiError } from '@/types';

export interface ConfirmRamassagePayload {
  parcelsCount?: number;
  notes?: string;
}

export interface RamassagesService {
  getRamassages(status?: 'all' | 'pending' | 'confirmed'): Promise<Ramassage[]>;
  getRamassageById(id: string): Promise<Ramassage>;
  confirmRamassage(ramassageId: string, payload?: ConfirmRamassagePayload): Promise<Ramassage>;
}

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? 300 + Math.random() * 250));

const initialRamassages: Ramassage[] = [
  {
    id: 'ram-001',
    code: 'RAM-TN-401',
    supplierName: 'Société Electro Ben Arous',
    supplierPhone: '71 345 678',
    address: 'Zone Industrielle Borj Cedria, Ben Arous',
    zoneId: 'zone-benarous',
    zoneName: 'Zone Ben Arous',
    status: 'pending',
    scheduledAt: '14:30',
    parcelsCount: 8,
    notes: 'Ramassage prévu quai 2, contacter Si Hichem',
  },
  {
    id: 'ram-002',
    code: 'RAM-TN-402',
    supplierName: 'Boutique Mode Carthage',
    supplierPhone: '71 890 123',
    address: '22 Avenue Habib Bourguiba, Tunis Centre',
    zoneId: 'zone-tunis',
    zoneName: 'Zone Tunis Centre',
    status: 'confirmed',
    scheduledAt: '11:00',
    confirmedAt: new Date(Date.now() - 3600000).toISOString(),
    parcelsCount: 15,
    notes: '15 colis réceptionnés et scannés',
  },
  {
    id: 'ram-003',
    code: 'RAM-TN-403',
    supplierName: 'Parfumerie Jasmine Nabeul',
    supplierPhone: '72 234 567',
    address: 'Route Touristique, Hammamet Sud',
    zoneId: 'zone-nabeul',
    zoneName: 'Zone Nabeul / Hammamet',
    status: 'pending',
    scheduledAt: '16:00',
    parcelsCount: 4,
    notes: 'Colis fragiles avec étiquettes rouges',
  },
  {
    id: 'ram-004',
    code: 'RAM-TN-404',
    supplierName: 'Comptoir Médical Sousse',
    supplierPhone: '73 456 789',
    address: 'Avenue Léopold Senghor, Sousse',
    zoneId: 'zone-sousse',
    zoneName: 'Zone Sousse Ville',
    status: 'pending',
    scheduledAt: '17:30',
    parcelsCount: 6,
  },
];

class MockRamassagesService implements RamassagesService {
  private inMemoryRamassages: Ramassage[] = [...initialRamassages];

  async getRamassages(status: 'all' | 'pending' | 'confirmed' = 'all'): Promise<Ramassage[]> {
    await delay();

    if (status === 'all') {
      return [...this.inMemoryRamassages];
    }
    return this.inMemoryRamassages.filter((r) => r.status === status);
  }

  async getRamassageById(id: string): Promise<Ramassage> {
    await delay();
    const item = this.inMemoryRamassages.find((r) => r.id === id);
    if (!item) {
      throw new AppApiError(404, 'Ramassage introuvable.', 'RAMASSAGE_NOT_FOUND');
    }
    return item;
  }

  async confirmRamassage(
    ramassageId: string,
    payload?: ConfirmRamassagePayload
  ): Promise<Ramassage> {
    await delay();

    const ramassage = this.inMemoryRamassages.find((r) => r.id === ramassageId);
    if (!ramassage) {
      throw new AppApiError(404, 'Ramassage introuvable.', 'RAMASSAGE_NOT_FOUND');
    }

    if (ramassage.status === 'confirmed') {
      return ramassage;
    }

    const updated: Ramassage = {
      ...ramassage,
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
      parcelsCount: payload?.parcelsCount ?? ramassage.parcelsCount,
      notes: payload?.notes ? `${ramassage.notes || ''} | ${payload.notes}` : ramassage.notes,
    };

    this.inMemoryRamassages = this.inMemoryRamassages.map((r) =>
      r.id === ramassageId ? updated : r
    );

    return updated;
  }
}

export const mockRamassagesService = new MockRamassagesService();
export const ramassagesService: RamassagesService = mockRamassagesService;
