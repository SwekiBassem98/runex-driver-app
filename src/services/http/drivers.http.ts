import type { DriversService } from '@/services/drivers.service';
import { apiClient, unwrap } from '@/services/api-client';
import { useAuthStore } from '@/store/auth.store';
import { Driver, Zone } from '@/types';
import { httpAuthService } from './auth.http';

interface ApiZone {
  id: string;
  name: string;
  code?: string;
  governorate?: string;
}

const toZone = (z: ApiZone): Zone => ({
  id: z.id,
  name: z.name,
  code: z.code,
  governorate: z.governorate,
});

/**
 * Profil du livreur. L'identité et les zones couvertes viennent de l'API
 * (`/drivers/me`, `/drivers/me/zones`). Le statut de service reste une
 * préférence du téléphone.
 */
class HttpDriversService implements DriversService {
  async getCurrentDriver(): Promise<Driver> {
    return httpAuthService.getMe();
  }

  private current(): Driver {
    const d = useAuthStore.getState().driver;
    if (!d) throw new Error('Session absente.');
    return d;
  }

  private save(driver: Driver): Driver {
    useAuthStore.getState().setDriver(driver);
    return { ...driver };
  }

  async getDriverZones(): Promise<Zone[]> {
    const zones = await unwrap<ApiZone[]>(apiClient.get('/drivers/me/zones'));
    return zones.map(toZone);
  }

  /** Zones actives de la plateforme (créées automatiquement à la saisie des colis). */
  async getAllZones(): Promise<Zone[]> {
    const zones = await unwrap<ApiZone[]>(apiClient.get('/zones'));
    return zones.map(toZone);
  }

  async addDriverZone(zoneId: string): Promise<Driver> {
    const d = this.current();
    if (d.zones.some((z) => z.id === zoneId)) return { ...d };
    return this.updateDriverZones([...d.zones.map((z) => z.id), zoneId]);
  }

  async removeDriverZone(zoneId: string): Promise<Driver> {
    const d = this.current();
    return this.updateDriverZones(d.zones.filter((z) => z.id !== zoneId).map((z) => z.id));
  }

  /** Enregistre les zones sur la plateforme : l'exploitation les voit aussitôt. */
  async updateDriverZones(zoneIds: string[]): Promise<Driver> {
    const zones = await unwrap<ApiZone[]>(apiClient.put('/drivers/me/zones', { zoneIds }));
    return this.save({ ...this.current(), zones: zones.map(toZone) });
  }

  async updateDriverStatus(status: 'active' | 'on_duty' | 'off_duty'): Promise<Driver> {
    return this.save({ ...this.current(), status });
  }
}

export const httpDriversService = new HttpDriversService();
