import { apiClient, unwrap } from '@/services/api-client';
import type { RunsheetsService } from '@/services/runsheets.service';
import {
  AppApiError,
  DeliverParcelPayload,
  ExchangeParcelPayload,
  Parcel,
  PartialDeliveryPayload,
  PostponeParcelPayload,
  ReturnParcelPayload,
  Runsheet,
} from '@/types';
import { ApiPackage, ApiRunsheet, toParcel, toRunsheet } from './mappers';

const enc = encodeURIComponent;

/** Tournée et actions de livraison sur l'API RUNEX. */
class HttpRunsheetsService implements RunsheetsService {
  async getActiveRunsheet(): Promise<Runsheet> {
    try {
      return toRunsheet(await unwrap<ApiRunsheet>(apiClient.get('/runsheets/driver/active')));
    } catch (err) {
      // 404 : aucune tournée ouverte aujourd'hui — un état normal, pas une erreur.
      if (err instanceof AppApiError && err.status === 404) {
        return {
          id: '',
          driverId: '',
          status: 'closed',
          parcels: [],
          createdAt: new Date().toISOString(),
        };
      }
      throw err;
    }
  }

  async getRunsheetById(id: string): Promise<Runsheet> {
    return toRunsheet(await unwrap<ApiRunsheet>(apiClient.get(`/runsheets/${enc(id)}`)));
  }

  /** Accepte l'identifiant interne comme le code scanné (numéro, code-barres, pièce). */
  async getParcelById(parcelId: string): Promise<Parcel> {
    return toParcel(await unwrap<ApiPackage>(apiClient.get(`/colis/${enc(parcelId)}`)));
  }

  private async act(parcelId: string, action: string, body: object): Promise<Parcel> {
    return toParcel(
      await unwrap<ApiPackage>(apiClient.post(`/colis/${enc(parcelId)}/${action}`, body))
    );
  }

  /** Démarrer la livraison (le colis passe « en cours de livraison »). */
  async startDelivery(parcelId: string): Promise<Parcel> {
    return this.act(parcelId, 'start', {});
  }

  async deliverParcel(parcelId: string, payload?: DeliverParcelPayload): Promise<Parcel> {
    return this.act(parcelId, 'deliver', {
      // Sans montant saisi, le serveur retient le montant à encaisser du colis.
      ...(payload?.codCollected !== undefined ? { collectedAmount: payload.codCollected } : {}),
      ...(payload?.notes ? { driverNote: payload.notes } : {}),
    });
  }

  async returnParcel(parcelId: string, payload: ReturnParcelPayload): Promise<Parcel> {
    return this.act(parcelId, 'return', {
      reason: payload.reason,
      ...(payload.notes ? { driverNote: payload.notes } : {}),
    });
  }

  async postponeParcel(parcelId: string, payload: PostponeParcelPayload): Promise<Parcel> {
    return this.act(parcelId, 'postpone', {
      reason: payload.reason,
      ...(payload.nextDeliveryDate ? { rescheduledDate: payload.nextDeliveryDate } : {}),
      ...(payload.notes ? { driverNote: payload.notes } : {}),
    });
  }

  async partialDelivery(parcelId: string, payload: PartialDeliveryPayload): Promise<Parcel> {
    const delivered = Number(payload.deliveredQuantity ?? 0);
    const parcel = await this.getParcelById(parcelId);
    const total = parcel.pieceCount ?? 1;
    return this.act(parcelId, 'partial-delivery', {
      deliveredPieces: delivered,
      deliveredDescription:
        payload.deliveredDescription?.trim() || `${delivered} pièce(s) remise(s) sur ${total}`,
      returnedDescription:
        payload.returnedDescription?.trim() ||
        `${Math.max(total - delivered, 0)} pièce(s) ramenée(s) au dépôt`,
      collectedAmount: Number(payload.amountCollected ?? 0),
      reason: payload.reason,
      ...(payload.notes ? { driverNote: payload.notes } : {}),
    });
  }

  async exchangeParcel(parcelId: string, payload: ExchangeParcelPayload): Promise<Parcel> {
    const parcel = await this.getParcelById(parcelId);
    return this.act(parcelId, 'exchange', {
      oldPackageBarcode: parcel.barcode ?? parcel.code,
      returnedItemSummary: payload.reason,
      newPackageBarcode: payload.newParcelCode ?? '',
      ...(payload.notes ? { note: payload.notes } : {}),
    });
  }
}

export const httpRunsheetsService = new HttpRunsheetsService();
