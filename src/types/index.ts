/**
 * LogiXpress Tunisie / RUNEX API Contract & Domain Types
 * Express 4 REST API under /api/v1, Prisma/PostgreSQL
 * Amounts in TND (Tunisian Dinar) formatted with 3 decimal places (e.g. 45.500 TND)
 */

export interface Zone {
  id: string;
  name: string;
  code?: string;
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
