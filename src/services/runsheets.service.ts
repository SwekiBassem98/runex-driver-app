import {
  Parcel,
  Runsheet,
  DeliverParcelPayload,
  ReturnParcelPayload,
  PostponeParcelPayload,
  PartialDeliveryPayload,
  ExchangeParcelPayload,
  AppApiError,
} from '@/types';
import { useUiStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { USE_MOCKS } from '@/config/env';
import { httpRunsheetsService } from './http/runsheets.http';

export interface RunsheetsService {
  getActiveRunsheet(): Promise<Runsheet>;
  getRunsheetById(id: string): Promise<Runsheet>;
  getParcelById(parcelId: string): Promise<Parcel>;
  startDelivery(parcelId: string): Promise<Parcel>;
  deliverParcel(parcelId: string, payload?: DeliverParcelPayload): Promise<Parcel>;
  returnParcel(parcelId: string, payload: ReturnParcelPayload): Promise<Parcel>;
  postponeParcel(parcelId: string, payload: PostponeParcelPayload): Promise<Parcel>;
  partialDelivery(parcelId: string, payload: PartialDeliveryPayload): Promise<Parcel>;
  exchangeParcel(parcelId: string, payload: ExchangeParcelPayload): Promise<Parcel>;
}

// Simulated network delay helper (300ms - 600ms)
const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? 300 + Math.random() * 300));

const CURRENT_DRIVER_ID = 'drv-7701';

/**
 * Initial populated Tunisian sample parcels
 */
const initialParcels: Parcel[] = [
  {
    id: 'pcl-001',
    code: 'RNX-TN-1001',
    clientName: 'Mohamed Ali Gharbi',
    clientPhone: '98 123 456',
    address: '14 Rue Habib Bourguiba, Ben Arous',
    zoneId: 'zone-benarous',
    zoneName: 'Zone Ben Arous',
    status: 'in_transit',
    codAmount: 45.5,
    driverId: CURRENT_DRIVER_ID,
    sequenceOrder: 1,
    attempts: 0,
    notes: 'Sonner au 2ème étage, interphone Gharbi',
  },
  {
    id: 'pcl-002',
    code: 'RNX-TN-1002',
    clientName: 'Fatma Trabelsi',
    clientPhone: '52 789 012',
    address: 'Appartement B4, Résidence Ennasr 2, Tunis',
    zoneId: 'zone-tunis',
    zoneName: 'Zone Tunis Centre',
    status: 'in_transit',
    codAmount: 120.0,
    driverId: CURRENT_DRIVER_ID,
    sequenceOrder: 2,
    attempts: 1,
    notes: 'Paiement en espèces uniquement',
  },
  {
    id: 'pcl-003',
    code: 'RNX-TN-1003',
    clientName: 'Youssef Ben Amor',
    clientPhone: '21 456 789',
    address: 'Zone Industrielle Megrine, Ben Arous',
    zoneId: 'zone-benarous',
    zoneName: 'Zone Ben Arous',
    status: 'delivered',
    codAmount: 85.75,
    driverId: CURRENT_DRIVER_ID,
    sequenceOrder: 3,
    attempts: 1,
    deliveredAt: new Date().toISOString(),
    notes: 'Livré au bureau d’accueil',
  },
  {
    id: 'pcl-004',
    code: 'RNX-TN-1004',
    clientName: 'Salma Riahi',
    clientPhone: '94 321 654',
    address: '28 Avenue de la République, Rades',
    zoneId: 'zone-benarous',
    zoneName: 'Zone Ben Arous',
    status: 'in_transit',
    codAmount: 32.0,
    driverId: CURRENT_DRIVER_ID,
    sequenceOrder: 4,
    attempts: 0,
  },
  {
    id: 'pcl-005',
    code: 'RNX-TN-1005',
    clientName: 'Karim Jaziri',
    clientPhone: '55 678 901',
    address: 'Route Touristique, Hammamet Nord',
    zoneId: 'zone-nabeul',
    zoneName: 'Zone Nabeul / Hammamet',
    status: 'postponed',
    codAmount: 64.2,
    driverId: CURRENT_DRIVER_ID,
    sequenceOrder: 5,
    attempts: 1,
    postponeReason: 'Client indisponible, demandé pour demain 14h',
  },
  {
    id: 'pcl-006',
    code: 'RNX-TN-1006',
    clientName: 'Amira Bouazizi',
    clientPhone: '29 876 543',
    address: 'Boulevard 14 Janvier, Sousse Ville',
    zoneId: 'zone-sousse',
    zoneName: 'Zone Sousse',
    status: 'returned',
    codAmount: 95.0,
    driverId: CURRENT_DRIVER_ID,
    sequenceOrder: 6,
    attempts: 2,
    returnReason: 'Colis refusé - Produit non conforme',
  },
  {
    id: 'pcl-007',
    code: 'RNX-TN-1007',
    clientName: 'Tarak Mansour',
    clientPhone: '97 654 321',
    address: 'Cité Ezzahra, Rue des Jasmin, Ben Arous',
    zoneId: 'zone-benarous',
    zoneName: 'Zone Ben Arous',
    status: 'in_transit',
    codAmount: 58.5,
    driverId: CURRENT_DRIVER_ID,
    sequenceOrder: 7,
    attempts: 0,
  },
  {
    id: 'pcl-008',
    code: 'RNX-TN-1008',
    clientName: 'Leila Khemir',
    clientPhone: '20 112 233',
    address: 'Avenue Habib Thameur, Passage, Tunis',
    zoneId: 'zone-tunis',
    zoneName: 'Zone Tunis Centre',
    status: 'in_transit',
    codAmount: 110.0,
    driverId: 'drv-OTHER', // Belongs to another driver to test driver mismatch 403
    sequenceOrder: 8,
    attempts: 0,
    notes: 'Attention: Colis assigné à un autre livreur',
  },
  {
    id: 'pcl-009',
    code: 'RNX-TN-1009',
    clientName: 'Sami Belhadj',
    clientPhone: '52 334 455',
    address: 'Rue Ibn Khaldoun, Mégrine, Ben Arous',
    zoneId: 'zone-benarous',
    zoneName: 'Zone Ben Arous',
    status: 'returned',
    codAmount: 42.0,
    driverId: CURRENT_DRIVER_ID,
    sequenceOrder: 9,
    attempts: 3,
    returnReason: 'Client injoignable après 3 tentatives',
  },
  {
    id: 'pcl-010',
    code: 'RNX-TN-1010',
    clientName: 'Nadia Chebbi',
    clientPhone: '98 776 655',
    address: 'Résidence Les Palmiers, Ennasr 2, Tunis',
    zoneId: 'zone-tunis',
    zoneName: 'Zone Tunis Centre',
    status: 'returned',
    codAmount: 125.0,
    driverId: CURRENT_DRIVER_ID,
    sequenceOrder: 10,
    attempts: 1,
    returnReason: 'Adresse erronée - Numéro de rue inexistant',
  },
];

class MockRunsheetsService implements RunsheetsService {
  private inMemoryParcels: Parcel[] = [...initialParcels];

  async getActiveRunsheet(): Promise<Runsheet> {
    await delay();

    const { simulateEmptyRunsheet } = useUiStore.getState();
    const currentDriver = useAuthStore.getState().driver;
    const driverId = currentDriver?.id || CURRENT_DRIVER_ID;

    if (simulateEmptyRunsheet) {
      return {
        id: 'rsh-empty-001',
        driverId,
        status: 'active',
        parcels: [],
        createdAt: new Date().toISOString(),
      };
    }

    return {
      id: 'rsh-2026-0929-01',
      driverId,
      status: 'active',
      parcels: [...this.inMemoryParcels],
      createdAt: new Date().toISOString(),
    };
  }

  async getRunsheetById(id: string): Promise<Runsheet> {
    await delay();
    return {
      id,
      driverId: CURRENT_DRIVER_ID,
      status: 'active',
      parcels: [...this.inMemoryParcels],
      createdAt: new Date().toISOString(),
    };
  }

  async getParcelById(parcelId: string): Promise<Parcel> {
    await delay(150);
    const parcel = this.inMemoryParcels.find((p) => p.id === parcelId);
    if (!parcel) {
      throw new AppApiError(404, 'Colis introuvable.', 'PARCEL_NOT_FOUND');
    }
    return { ...parcel };
  }

  async startDelivery(parcelId: string): Promise<Parcel> {
    await delay(150);
    const parcel = this.inMemoryParcels.find((p) => p.id === parcelId);
    if (!parcel) throw new AppApiError(404, 'Colis introuvable.', 'PARCEL_NOT_FOUND');
    return { ...parcel };
  }

  async deliverParcel(parcelId: string, payload?: DeliverParcelPayload): Promise<Parcel> {
    await delay();

    const parcel = this.inMemoryParcels.find((p) => p.id === parcelId);
    if (!parcel) {
      throw new AppApiError(404, 'Colis introuvable dans la feuille de route.', 'PARCEL_NOT_FOUND');
    }

    // Permission rule 1: Driver can only deliver parcels assigned to their own driverId
    const currentDriver = useAuthStore.getState().driver;
    const currentDriverId = currentDriver?.id || CURRENT_DRIVER_ID;
    if (parcel.driverId && parcel.driverId !== currentDriverId) {
      throw new AppApiError(
        403,
        "Action refusée: ce colis n'est pas assigné à votre tournée de livraison.",
        'FORBIDDEN_NOT_ASSIGNED_DRIVER'
      );
    }

    // Success transition to 'delivered'
    const updated: Parcel = {
      ...parcel,
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
      notes: payload?.notes ? `${parcel.notes || ''} | ${payload.notes}` : parcel.notes,
    };

    this.inMemoryParcels = this.inMemoryParcels.map((p) => (p.id === parcelId ? updated : p));
    return updated;
  }

  async returnParcel(parcelId: string, payload: ReturnParcelPayload): Promise<Parcel> {
    await delay();

    const parcel = this.inMemoryParcels.find((p) => p.id === parcelId);
    if (!parcel) {
      throw new AppApiError(404, 'Colis introuvable.', 'PARCEL_NOT_FOUND');
    }

    const currentDriver = useAuthStore.getState().driver;
    const currentDriverId = currentDriver?.id || CURRENT_DRIVER_ID;
    if (parcel.driverId && parcel.driverId !== currentDriverId) {
      throw new AppApiError(
        403,
        "Action refusée: vous ne pouvez pas retourner un colis d'une autre tournée.",
        'FORBIDDEN_NOT_ASSIGNED_DRIVER'
      );
    }

    if (!payload.reason || !payload.reason.trim()) {
      throw new AppApiError(400, 'Le motif de retour est obligatoire.', 'MISSING_RETURN_REASON');
    }

    const updated: Parcel = {
      ...parcel,
      status: 'returned',
      returnReason: payload.reason,
      notes: payload.notes ? `${parcel.notes || ''} | ${payload.notes}` : parcel.notes,
      updatedAt: new Date().toISOString(),
    };

    this.inMemoryParcels = this.inMemoryParcels.map((p) => (p.id === parcelId ? updated : p));
    return updated;
  }

  async postponeParcel(parcelId: string, payload: PostponeParcelPayload): Promise<Parcel> {
    await delay();

    const parcel = this.inMemoryParcels.find((p) => p.id === parcelId);
    if (!parcel) {
      throw new AppApiError(404, 'Colis introuvable.', 'PARCEL_NOT_FOUND');
    }

    // Check driver assignment first
    const currentDriver = useAuthStore.getState().driver;
    const currentDriverId = currentDriver?.id || CURRENT_DRIVER_ID;
    if (parcel.driverId && parcel.driverId !== currentDriverId) {
      throw new AppApiError(
        403,
        'Action refusée: colis non assigné à votre profil.',
        'FORBIDDEN_NOT_ASSIGNED_DRIVER'
      );
    }

    // Permission rule 2: Known backend restriction where LIVREUR role lacks COLIS_UPDATE
    const { simulatePermission403Error } = useUiStore.getState();
    if (simulatePermission403Error) {
      throw new AppApiError(
        403,
        "Action refusée: la permission COLIS_UPDATE est requise pour reporter ce colis. Le rôle LIVREUR ne dispose pas de ce droit sur l'API.",
        'COLIS_UPDATE_FORBIDDEN',
        { requiredPermission: 'COLIS_UPDATE', userRole: 'LIVREUR' }
      );
    }

    const updated: Parcel = {
      ...parcel,
      status: 'postponed',
      postponeReason: payload.reason,
      deliveryDate: payload.nextDeliveryDate,
      attempts: (parcel.attempts || 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    this.inMemoryParcels = this.inMemoryParcels.map((p) => (p.id === parcelId ? updated : p));
    return updated;
  }

  async partialDelivery(parcelId: string, payload: PartialDeliveryPayload): Promise<Parcel> {
    await delay();

    const parcel = this.inMemoryParcels.find((p) => p.id === parcelId);
    if (!parcel) {
      throw new AppApiError(404, 'Colis introuvable.', 'PARCEL_NOT_FOUND');
    }

    // Permission rule: LIVREUR lacks COLIS_UPDATE permission
    const { simulatePermission403Error } = useUiStore.getState();
    if (simulatePermission403Error) {
      throw new AppApiError(
        403,
        'Action refusée: la permission COLIS_UPDATE est requise pour enregistrer une livraison partielle. Contactez votre superviseur.',
        'COLIS_UPDATE_FORBIDDEN',
        { requiredPermission: 'COLIS_UPDATE', userRole: 'LIVREUR' }
      );
    }

    const updated: Parcel = {
      ...parcel,
      status: 'partially_delivered',
      partialQuantity: payload.deliveredQuantity,
      notes: `Livraison partielle: ${payload.reason}`,
      updatedAt: new Date().toISOString(),
    };

    this.inMemoryParcels = this.inMemoryParcels.map((p) => (p.id === parcelId ? updated : p));
    return updated;
  }

  async exchangeParcel(parcelId: string, payload: ExchangeParcelPayload): Promise<Parcel> {
    await delay();

    const parcel = this.inMemoryParcels.find((p) => p.id === parcelId);
    if (!parcel) {
      throw new AppApiError(404, 'Colis introuvable.', 'PARCEL_NOT_FOUND');
    }

    const { simulatePermission403Error } = useUiStore.getState();
    if (simulatePermission403Error) {
      throw new AppApiError(
        403,
        'Action refusée: la permission COLIS_UPDATE est requise pour procéder à un échange.',
        'COLIS_UPDATE_FORBIDDEN'
      );
    }

    const updated: Parcel = {
      ...parcel,
      status: 'exchanged',
      notes: `Échange contre ${payload.newParcelCode || 'nouveau colis'}: ${payload.reason}`,
      updatedAt: new Date().toISOString(),
    };

    this.inMemoryParcels = this.inMemoryParcels.map((p) => (p.id === parcelId ? updated : p));
    return updated;
  }
}

export const mockRunsheetsService = new MockRunsheetsService();
export const runsheetsService: RunsheetsService = USE_MOCKS
  ? mockRunsheetsService
  : httpRunsheetsService;
