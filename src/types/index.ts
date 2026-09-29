export type ParcelStatus = 'en_livraison' | 'livre' | 'reporte' | 'retour' | 'relance';

export interface Parcel {
  id: string;
  trackingNumber: string;
  clientName: string;
  clientPhone: string;
  address: string;
  zone: string;
  amount: number; // in TND
  currency: 'TND';
  status: ParcelStatus;
  attempts: number;
  deliveryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PickupStatus = 'prevu' | 'en_cours' | 'effectue';

export interface Pickup {
  id: string;
  code: string;
  senderName: string;
  senderPhone: string;
  address: string;
  parcelsCount: number;
  status: PickupStatus;
  scheduledTime?: string;
  notes?: string;
  createdAt: string;
}

export interface Zone {
  id: string;
  name: string;
  code: string;
}

export interface DriverProfile {
  id: string;
  fullName: string;
  matricule: string;
  phone: string;
  cin: string;
  agency: string;
  zones: Zone[];
  avatarUrl?: string;
}

export interface RunsheetSummary {
  totalParcels: number;
  inDelivery: number;
  delivered: number;
  postponed: number;
  returned: number;
  relanced: number;
  cashCollectedTND: number;
}
