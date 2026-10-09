/**
 * LogiXpress Tunisie / RUNEX API Contract & Domain Types
 * Express 4 REST API under /api/v1, Prisma/PostgreSQL
 * Amounts in TND (Tunisian Dinar) formatted with 3 decimal places (e.g. 45.500 TND)
 */

export interface Zone {
  id: string;
  name: string;
  code?: string;
  /** Gouvernorat de la zone (zones de la plateforme). */
  governorate?: string;
}

export interface Driver {
  id: string;
  fullName: string;
  phone: string;
  cin: string;
  agency: string;
  zones: Zone[];
  matricule: string;
  avatarUrl?: string;
  status?: 'active' | 'on_duty' | 'off_duty';
}

export type ParcelStatus =
  | 'pending'
  | 'assigned'
  | 'in_transit'
  | 'delivered'
  | 'partially_delivered'
  | 'postponed'
  | 'returned'
  | 'cancelled'
  | 'exchanged';

export interface Parcel {
  id: string;
  code: string;
  clientName: string;
  clientPhone: string;
  address: string;
  zoneId: string;
  zoneName?: string;
  status: ParcelStatus;
  codAmount?: number; // TND with 3 decimal places, e.g. 45.500
  notes?: string;
  driverId?: string;
  sequenceOrder?: number;
  attempts?: number;
  deliveryDate?: string;
  deliveredAt?: string;
  returnReason?: string;
  postponeReason?: string;
  partialQuantity?: number;
  createdAt?: string;
  updatedAt?: string;

  // Données réelles de l'API RUNEX (absentes des données de démonstration)
  /** Numéro de suivi (14 chiffres), identifiant des actions `/colis/{n°}/…`. */
  trackingNumber?: string;
  /** Code-barres imprimé sur le bon de livraison (15 chiffres). */
  barcode?: string;
  pieceCount?: number;
  governorate?: string;
  delegation?: string;
  shipperName?: string;
  contentSummary?: string;
  allowOpen?: boolean;
  isFragile?: boolean;
  /** NORMAL | EXCHANGE | REPORTED | RETURN */
  packageType?: string;
  /** Statut exact côté serveur (AFFECTE_RUNSHEET, EN_COURS_LIVRAISON…). */
  backendStatus?: string;
  backendStatusLabel?: string;
  collectedAmount?: number;
}

export type RunsheetStatus = 'active' | 'in_progress' | 'completed' | 'closed';

export interface Runsheet {
  id: string;
  driverId: string;
  status: RunsheetStatus;
  parcels: Parcel[];
  createdAt: string;
  closedAt?: string;
}

export type RamassageStatus = 'pending' | 'confirmed';

export interface Ramassage {
  /** Référence du rendez-vous (RDV-…), identifiant des appels `/ramassages/{ref}`. */
  id: string;
  code: string;
  supplierName: string;
  supplierPhone?: string;
  address: string;
  zoneId: string;
  zoneName?: string;
  status: RamassageStatus;
  scheduledAt?: string;
  parcelsCount?: number;
  notes?: string;
  confirmedAt?: string;
  /** Statut serveur : ASSIGNE, EN_COURS, EFFECTUE… */
  backendStatus?: string;
  /** Annoncés par l'expéditeur / réellement rattachés (scannés). */
  estimatedCount?: number;
  pickedCount?: number;
}

// Alias Pickup to Ramassage for convenience
export type Pickup = Ramassage;

export interface DashboardStats {
  totalParcels: number;
  inTransit: number;
  delivered: number;
  reported: number; // Postponed
  returned: number;
  relaunches: number;
  cashCollected: number; // TND with 3 decimal places
}

export interface ApiError {
  status: number;
  code?: string;
  message: string;
  details?: unknown;
}

/**
 * Custom Error class that conforms to ApiError interface
 * Allows clean throw/catch with status and code inspection
 */
export class AppApiError extends Error implements ApiError {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = 'AppApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppApiError.prototype);
  }
}

// Parcel Action Payloads
export interface DeliverParcelPayload {
  codCollected?: number; // TND
  notes?: string;
}

export interface ReturnParcelPayload {
  reason: string;
  notes?: string;
}

export interface PostponeParcelPayload {
  reason: string;
  nextDeliveryDate?: string;
  notes?: string;
}

export interface PartialDeliveryPayload {
  deliveredQuantity?: number;
  amountCollected?: number;
  /** Ce que le client a reçu / ce qui repart (sinon décrit d'après les pièces). */
  deliveredDescription?: string;
  returnedDescription?: string;
  reason: string;
  notes?: string;
}

export interface ExchangeParcelPayload {
  newParcelCode?: string;
  reason: string;
  notes?: string;
}

/**
 * Format amounts in Tunisian Dinar (TND) with 3 decimals
 * Example: 45.5 -> "45.500 TND"
 */
export function formatTND(amount: number = 0): string {
  return `${amount.toFixed(3)} TND`;
}

// ---------------------------------------------------------------------------
// Scan d'un code (QR / code-barres du bon de livraison) — POST /scan
// ---------------------------------------------------------------------------

/** Raisons de refus renvoyées par l'API (champ `code`). */
export type ScanErrorCode =
  'INVALID_CODE' | 'UNKNOWN_CODE' | 'PIECE_NOT_FOUND' | 'NOT_ASSIGNED' | 'OUT_OF_SCOPE';

export type ScanRelation = 'DELIVERY' | 'PICKUP' | 'SHIPPER' | 'DEPOT' | 'BACK_OFFICE';

export interface ScanAction {
  key:
    | 'start'
    | 'deliver'
    | 'partial-delivery'
    | 'exchange'
    | 'postpone'
    | 'failed-attempt'
    | 'return'
    | 'pickup-attach'
    | 'pickup-detach';
  label: string;
  method: 'POST' | 'PATCH';
  path: string;
  body?: Record<string, unknown>;
}

export interface ScanResult {
  code: string;
  kind: 'barcode' | 'piece' | 'business-number' | 'uuid';
  piece: { number: number; count: number } | null;
  relation: ScanRelation;
  pickup?: { referenceNumber: string; status: string; attached: boolean };
  nextStatuses: string[];
  actions: ScanAction[];
  parcel: Parcel;
}
