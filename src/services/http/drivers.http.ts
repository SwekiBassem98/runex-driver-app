import { jourTunis } from '@/utils/zones';
import type { DriversService } from '@/services/drivers.service';
import { apiClient, unwrap } from '@/services/api-client';
import { useAuthStore } from '@/store/auth.store';
import { Driver, DriverGains, Zone } from '@/types';
import { httpAuthService } from './auth.http';

interface ApiZone {
  id: string;
  name: string;
  code?: string;
  governorate?: string;
  delegation?: string;
}

const toZone = (z: ApiZone): Zone => ({
  id: z.id,
  name: z.name,
  code: z.code,
  governorate: z.governorate,
  delegation: z.delegation,
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

  async getGains(): Promise<DriverGains> {
    return unwrap<DriverGains>(apiClient.get('/drivers/me/gains'));
  }

  /** Zones du jour, lues sur la plateforme (et gardées sur le téléphone pour la journée). */
  async getDriverZones(): Promise<Zone[]> {
    const zones = (await unwrap<ApiZone[]>(apiClient.get('/drivers/me/zones'))).map(toZone);
    const d = useAuthStore.getState().driver;
    if (d) this.save({ ...d, zones, zonesDay: jourTunis() });
    return zones;
  }

  /** Zones actives de la plateforme (créées automatiquement à la saisie des colis). */
  async getAllZones(): Promise<Zone[]> {
    const zones = await unwrap<ApiZone[]>(apiClient.get('/zones'));
    return zones.map(toZone);
  }

  // Ajout et retrait partent des zones du jour lues sur la plateforme : une
  // zone gardée de la veille sur le téléphone ne doit pas être renvoyée.
  async addDriverZone(zoneId: string): Promise<Driver> {
    const actuelles = await this.getDriverZones();
    if (actuelles.some((z) => z.id === zoneId)) return { ...this.current() };
    return this.updateDriverZones([...actuelles.map((z) => z.id), zoneId]);
  }

  async removeDriverZone(zoneId: string): Promise<Driver> {
    const actuelles = await this.getDriverZones();
    return this.updateDriverZones(actuelles.filter((z) => z.id !== zoneId).map((z) => z.id));
  }

  /** Enregistre les zones sur la plateforme : l'exploitation les voit aussitôt. */
  async updateDriverZones(zoneIds: string[]): Promise<Driver> {
    const zones = await unwrap<ApiZone[]>(apiClient.put('/drivers/me/zones', { zoneIds }));
    return this.save({ ...this.current(), zones: zones.map(toZone), zonesDay: jourTunis() });
  }

  async updateDriverStatus(status: 'active' | 'on_duty' | 'off_duty'): Promise<Driver> {
    return this.save({ ...this.current(), status });
  }
}

export const httpDriversService = new HttpDriversService();
