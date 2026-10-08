import { apiClient, unwrap } from '@/services/api-client';
import type {
  ConfirmRamassagePayload,
  ListRamassagesOptions,
  RamassagesService,
} from '@/services/ramassages.service';
import { AppApiError, Pickup, Ramassage } from '@/types';
import { ApiPickup, toRamassage } from './mappers';

const enc = encodeURIComponent;

/** Ramassages du livreur sur l'API RUNEX (référence RDV-… comme identifiant). */
class HttpRamassagesService implements RamassagesService {
  async list(options?: ListRamassagesOptions): Promise<Pickup[]> {
    const rows = await unwrap<ApiPickup[]>(apiClient.get('/ramassages/driver/active'));
    const all = (rows ?? []).map(toRamassage);
    const status = options?.status ?? 'all';
    return status === 'all' ? all : all.filter((p) => p.status === status);
  }

  async getById(id: string): Promise<Pickup> {
    return toRamassage(await unwrap<ApiPickup>(apiClient.get(`/ramassages/${enc(id)}`)));
  }

  /**
   * « Marquer comme récupéré » : démarre le ramassage s'il ne l'est pas encore,
   * puis le clôture. Les colis collectés sont ceux rattachés par scan.
   */
  async confirm(id: string, payload?: ConfirmRamassagePayload): Promise<Pickup> {
    let current = await this.getById(id);
    if (current.backendStatus === 'ASSIGNE') {
      current = toRamassage(
        await unwrap<ApiPickup>(apiClient.patch(`/ramassages/${enc(id)}/start`, {}))
      );
    }
    if (current.backendStatus !== 'EN_COURS') {
      throw new AppApiError(
        409,
        `Ce ramassage ne peut pas être clôturé (statut ${current.backendStatus}).`,
        'PICKUP_NOT_OPEN'
      );
    }
    return toRamassage(
      await unwrap<ApiPickup>(
        apiClient.patch(
          `/ramassages/${enc(id)}/complete`,
          payload?.notes ? { notes: payload.notes } : {}
        )
      )
    );
  }

  /** Rattache au ramassage un colis scanné (code du bon de livraison ou identifiant). */
  async attachParcel(id: string, code: string): Promise<Pickup> {
    return toRamassage(
      await unwrap<ApiPickup>(
        apiClient.patch(`/ramassages/${enc(id)}/packages`, { attach: [code] })
      )
    );
  }

  getRamassages(status: 'all' | 'pending' | 'confirmed' = 'all'): Promise<Ramassage[]> {
    return this.list({ status });
  }
  getRamassageById(id: string): Promise<Ramassage> {
    return this.getById(id);
  }
  confirmRamassage(id: string, payload?: ConfirmRamassagePayload): Promise<Ramassage> {
    return this.confirm(id, payload);
  }

  // Sans objet avec l'API réelle (outils de la démonstration).
  setMockState(): void {}
  getMockState(): 'populated' | 'empty' {
    return 'populated';
  }
  resetMockData(): void {}
}

export const httpRamassagesService = new HttpRamassagesService();
