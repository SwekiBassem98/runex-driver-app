import { Driver, Parcel, ParcelStatus, Ramassage, Runsheet, RunsheetStatus } from '@/types';

/**
 * Formes renvoyées par l'API RUNEX (packages/types côté serveur), réduites aux
 * champs que l'application utilise, et leur traduction vers les types de
 * l'application.
 */

export interface ApiAuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: string;
  driverId?: string;
  driverName?: string;
  depositId?: string;
  depositName?: string;
}

export interface ApiLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: ApiAuthUser;
}

export interface ApiDriverProfile {
  id: string;
  driverCode: string;
  fullName: string;
  phone: string;
  vehicleType?: string;
  licensePlate?: string;
  depositName?: string;
  governorate?: string;
  /** Zones couvertes, tenues par la plateforme. */
  zones?: { id: string; name: string; code?: string; governorate?: string }[];
}

export interface ApiPackage {
  id: string;
  trackingNumber: string;
  barcode: string;
  customerName: string;
  customerPhone: string;
  governorate: string;
  delegation: string;
  address: string;
  packageType: string;
  status: string;
  pieceCount: number;
  contentSummary: string;
  allowOpen: boolean;
  isFragile?: boolean;
  totalPrice: number;
  collectedAmount: number;
  shipperName: string;
  assignedDriverId?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  driverNote?: string;
  deliveryAttempts?: { reason?: string; status?: string }[];
  returns?: { reason?: string }[];
  exchange?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiRunsheet {
  id: string;
  runsheetNumber: string;
  driverId: string;
  status: string;
  createdAt: string;
  closedAt?: string;
  packages?: ApiPackage[];
}

export interface ApiPickup {
  id: string;
  referenceNumber: string;
  shipperName: string;
  scheduledDate: string;
  timeSlotStartHour: number;
  timeSlotEndHour: number;
  pickupAddress: string;
  contactPerson: string;
  contactPhone: string;
  packageEstimate: number;
  actualPickedCount: number;
  status: string;
  notes?: string;
  completedAt?: string;
}

/** Libellés français des statuts serveur, pour l'affichage. */
export const BACKEND_STATUS_LABELS: Record<string, string> = {
  CREE: 'Créé',
  RAMASSAGE_PROGRAMME: 'Ramassage programmé',
  RAMASSE: 'Ramassé',
  RECU_DEPOT: 'Reçu au dépôt',
  EN_LOT_INTER_DEPOT: 'En lot inter-dépôt',
  EN_TRANSIT_INTER_DEPOT: 'En transit inter-dépôt',
  RECU_DEPOT_DESTINATION: 'Reçu à l’agence',
  AFFECTE_RUNSHEET: 'Dans la tournée',
  EN_COURS_LIVRAISON: 'En cours de livraison',
  LIVRE: 'Livré',
  LIVRAISON_PARTIELLE: 'Livraison partielle',
  REPORTE: 'Reporté',
  ECHEC_LIVRAISON: 'Échec de livraison',
  RETOUR_DEPOT: 'Retour dépôt',
  EN_RUNSHEET_RETOUR: 'En tournée retour',
  RETOURNE_EXPEDITEUR: 'Retourné à l’expéditeur',
  ANNULE: 'Annulé',
};

/**
 * Statut serveur → statut de l'application. « À livrer » regroupe les colis
 * de la tournée qui attendent le livreur (dans la tournée ou en cours).
 */
export function toParcelStatus(status: string, hasExchange = false): ParcelStatus {
  switch (status) {
    case 'AFFECTE_RUNSHEET':
    case 'EN_COURS_LIVRAISON':
      return 'in_transit';
    case 'LIVRE':
      return hasExchange ? 'exchanged' : 'delivered';
    case 'LIVRAISON_PARTIELLE':
      return 'partially_delivered';
    case 'REPORTE':
    case 'ECHEC_LIVRAISON':
      return 'postponed';
    case 'RETOUR_DEPOT':
    case 'EN_RUNSHEET_RETOUR':
    case 'RETOURNE_EXPEDITEUR':
      return 'returned';
    case 'ANNULE':
      return 'cancelled';
    default:
      return 'pending';
  }
}

export function toParcel(p: ApiPackage, sequenceOrder?: number): Parcel {
  const lastAttempt = p.deliveryAttempts?.[0];
  const lastReturn = p.returns?.[0];
  return {
    id: p.id,
    code: p.trackingNumber,
    trackingNumber: p.trackingNumber,
    barcode: p.barcode,
    clientName: p.customerName,
    clientPhone: p.customerPhone,
    address: [p.address, p.delegation, p.governorate].filter(Boolean).join(', '),
    governorate: p.governorate,
    delegation: p.delegation,
    zoneId: p.governorate,
    zoneName: p.delegation ? `${p.governorate} · ${p.delegation}` : p.governorate,
    status: toParcelStatus(p.status, Boolean(p.exchange)),
    backendStatus: p.status,
    backendStatusLabel: BACKEND_STATUS_LABELS[p.status] ?? p.status,
    codAmount: Number(p.totalPrice ?? 0),
    collectedAmount: Number(p.collectedAmount ?? 0),
    notes: p.notes,
    driverId: p.assignedDriverId,
    sequenceOrder,
    attempts: p.deliveryAttempts?.length ?? 0,
    deliveryDate: p.expectedDeliveryDate,
    postponeReason:
      p.status === 'REPORTE' || p.status === 'ECHEC_LIVRAISON' ? lastAttempt?.reason : undefined,
    returnReason: lastReturn?.reason,
    pieceCount: p.pieceCount,
    shipperName: p.shipperName,
    contentSummary: p.contentSummary,
    allowOpen: p.allowOpen,
    isFragile: p.isFragile,
    packageType: p.packageType,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

const OPEN_RUNSHEET = [
  'BROUILLON',
  'PREPARE',
  'ASSIGNE',
  'EN_COURS',
  'EN_ATTENTE',
  'VALIDEE_DEPART',
];

export function toRunsheet(r: ApiRunsheet): Runsheet {
  const status: RunsheetStatus = OPEN_RUNSHEET.includes(r.status) ? 'active' : 'closed';
  return {
    id: r.id,
    driverId: r.driverId,
    status,
    parcels: (r.packages ?? []).map((p, i) => toParcel(p, i + 1)),
    createdAt: r.createdAt,
    closedAt: r.closedAt,
  };
}

export function toRamassage(p: ApiPickup): Ramassage {
  const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
  return {
    id: p.referenceNumber,
    code: p.referenceNumber,
    supplierName: p.shipperName,
    supplierPhone: p.contactPhone,
    address: p.pickupAddress,
    zoneId: '',
    status: p.status === 'EFFECTUE' ? 'confirmed' : 'pending',
    backendStatus: p.status,
    scheduledAt: `${pad(p.timeSlotStartHour)} – ${pad(p.timeSlotEndHour)}`,
    parcelsCount: p.actualPickedCount || p.packageEstimate,
    estimatedCount: p.packageEstimate,
    pickedCount: p.actualPickedCount,
    notes:
      [p.contactPerson ? `Contact : ${p.contactPerson}` : '', p.notes ?? '']
        .filter(Boolean)
        .join(' · ') || undefined,
    confirmedAt: p.completedAt,
  };
}

export function toDriver(
  user: ApiAuthUser,
  profile?: ApiDriverProfile | null,
  previous?: Driver | null
): Driver {
  return {
    id: user.driverId ?? profile?.id ?? user.id,
    fullName: profile?.fullName ?? user.fullName,
    phone: profile?.phone ?? user.phone,
    // La CIN n'est pas tenue par la plateforme.
    cin: previous?.cin ?? '',
    agency: profile?.depositName ?? user.depositName ?? '',
    matricule: profile?.licensePlate || profile?.driverCode || '',
    // Zones couvertes : tenues par la plateforme (« Mes zones »).
    zones: profile?.zones ?? previous?.zones ?? [],
    status: 'on_duty',
  };
}
