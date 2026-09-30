import { useState, useEffect, useCallback, useMemo } from 'react';
import { runsheetsService } from '@/services/runsheets.service';
import { Runsheet, Parcel, ApiError } from '@/types';

export interface UseActiveRunsheetReturn {
  runsheet: Runsheet | null;
  parcels: Parcel[];
  loading: boolean;
  refreshing: boolean;
  noActiveRunsheet: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
  setRunsheet: React.Dispatch<React.SetStateAction<Runsheet | null>>;
}

/**
 * useActiveRunsheet Hook
 * Centralizes the active-runsheet loading logic across screens:
 * Runsheet, Retour, Scanner, and Dashboard drilldowns.
 * Sourced directly from runsheetsService.getActiveRunsheet().
 */
export function useActiveRunsheet(): UseActiveRunsheetReturn {
  const [runsheet, setRunsheet] = useState<Runsheet | null>(null);
  const [noActiveRunsheet, setNoActiveRunsheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchRunsheet = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await runsheetsService.getActiveRunsheet();
      if (!data || data.status !== 'active') {
        setNoActiveRunsheet(true);
        setRunsheet(null);
      } else {
        setRunsheet(data);
        setNoActiveRunsheet(false);
      }
    } catch (err: unknown) {
      setNoActiveRunsheet(true);
      setRunsheet(null);
      setError(err as ApiError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    runsheetsService
      .getActiveRunsheet()
      .then((data) => {
        if (!isMounted) return;
        if (!data || data.status !== 'active') {
          setNoActiveRunsheet(true);
          setRunsheet(null);
        } else {
          setRunsheet(data);
          setNoActiveRunsheet(false);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setNoActiveRunsheet(true);
        setRunsheet(null);
        setError(err as ApiError);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    await fetchRunsheet(true);
  }, [fetchRunsheet]);

  const parcels = useMemo(() => runsheet?.parcels || [], [runsheet]);

  return {
    runsheet,
    parcels,
    loading,
    refreshing,
    noActiveRunsheet,
    error,
    refresh,
    setRunsheet,
  };
}
