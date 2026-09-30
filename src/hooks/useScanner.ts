import { useState, useCallback, useRef } from 'react';
import { useCameraPermissions, BarcodeScanningResult } from 'expo-camera';

export interface UseScannerOptions {
  onScan?: (code: string) => void;
  cooldownMs?: number;
}

export interface UseScannerReturn {
  hasPermission: boolean | null;
  isPermissionGranted: boolean;
  requestPermission: () => Promise<boolean>;
  torchEnabled: boolean;
  toggleTorch: () => void;
  setTorchEnabled: (enabled: boolean) => void;
  isScanning: boolean;
  pauseScanning: () => void;
  resumeScanning: () => void;
  handleBarcodeScanned: (result: BarcodeScanningResult | { data: string }) => void;
}

/**
 * useScanner Hook
 * Decouples camera and barcode scanning specifics from the UI screen.
 * Allows swapping camera/barcode scanning libraries (expo-camera, vision-camera, mlkit)
 * without modifying scanner screen components.
 */
export function useScanner(options?: UseScannerOptions): UseScannerReturn {
  const { onScan, cooldownMs = 1500 } = options || {};

  const [permission, requestExpoPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(true);

  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScanTimestampRef = useRef<number>(0);

  const isPermissionGranted = permission?.granted ?? false;
  const hasPermission = permission ? permission.granted : null;

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const response = await requestExpoPermission();
      return response.granted;
    } catch {
      return false;
    }
  }, [requestExpoPermission]);

  const toggleTorch = useCallback(() => {
    setTorchEnabled((prev) => !prev);
  }, []);

  const pauseScanning = useCallback(() => {
    setIsScanning(false);
  }, []);

  const resumeScanning = useCallback(() => {
    setIsScanning(true);
    lastScannedCodeRef.current = null;
  }, []);

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult | { data: string }) => {
      if (!isScanning) return;

      const code = result?.data?.trim();
      if (!code) return;

      const now = Date.now();
      if (code === lastScannedCodeRef.current && now - lastScanTimestampRef.current < cooldownMs) {
        return; // Ignore duplicated rapid triggers
      }

      lastScannedCodeRef.current = code;
      lastScanTimestampRef.current = now;

      if (onScan) {
        onScan(code);
      }
    },
    [isScanning, cooldownMs, onScan]
  );

  return {
    hasPermission,
    isPermissionGranted,
    requestPermission,
    torchEnabled,
    toggleTorch,
    setTorchEnabled,
    isScanning,
    pauseScanning,
    resumeScanning,
    handleBarcodeScanned,
  };
}
