import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView } from 'expo-camera';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { BottomNav, BottomNavTab, PrimaryButton, SecondaryButton } from '@/components';
import { useScanner } from '@/hooks';
import { runsheetsService } from '@/services/runsheets.service';
import { scanService, scanErrorMessage } from '@/services/scan.service';
import { Runsheet, ScanAction, ScanResult, formatTND } from '@/types';

/**
 * RUNEX Driver Barcode Scanner Screen
 * Route: /app/(tabs)/scanner.tsx
 *
 * Implements:
 * - Decoupled barcode scanner via useScanner() hook
 * - Full-bleed dark camera view with corner-bracket frame overlay
 * - Permission request state view
 * - Flash ON/OFF and Saisie Manuelle pill buttons
 * - Lookup through POST /scan (QR / code-barres du bon de livraison, étiquette
 *   de pièce « …-2 », numéro de suivi saisi) — le serveur dit quel colis et ce
 *   que le livreur peut en faire
 * - Colis de la tournée → fiche du colis (/runsheet/[id]) avec la pièce lue
 * - Colis à ramasser → fiche courte + « Ajouter au ramassage »
 * - Refus explicites (illisible, inconnu, non affecté, pièce invalide)
 */
export default function ScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Active runsheet state
  const [activeRunsheet, setActiveRunsheet] = useState<Runsheet | null>(null);
  const [loadingRunsheet, setLoadingRunsheet] = useState(true);

  // Manual entry modal state
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Inline toast error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animated laser scan line
  const [laserAnim] = useState(() => new Animated.Value(0));

  // Load driver's active runsheet once on mount
  useEffect(() => {
    let isMounted = true;
    runsheetsService
      .getActiveRunsheet()
      .then((data) => {
        if (isMounted) setActiveRunsheet(data);
      })
      .catch(() => {
        if (isMounted) setActiveRunsheet(null);
      })
      .finally(() => {
        if (isMounted) setLoadingRunsheet(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Continuous animation for the scan laser line
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [laserAnim]);

  // Show inline error toast without leaving the scanner
  const showErrorToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setErrorMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setErrorMessage(null);
    }, 4000);
  }, []);

  // Résultat d'un scan qui n'ouvre pas directement la fiche (ramassage…)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [actionRunning, setActionRunning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleProcessCode = useCallback(
    async (scannedRaw: string) => {
      const code = scannedRaw.trim();
      if (!code || processing) return;
      setProcessing(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      try {
        const result = await scanService.scan(code);
        const fromManual = manualModalVisible;
        setManualModalVisible(false);
        setManualCode('');
        if (result.relation === 'DELIVERY') {
          const params = result.piece
            ? `?piece=${result.piece.number}&count=${result.piece.count}`
            : '';
          const open = () => router.push(`/runsheet/${result.parcel.id}${params}`);
          // Laisser la feuille de saisie se refermer avant d'ouvrir la fiche.
          if (fromManual) setTimeout(open, 350);
          else open();
        } else if (fromManual) {
          // iOS refuse d'ouvrir une feuille pendant la fermeture d'une autre.
          setTimeout(() => setScanResult(result), 450);
        } else {
          setScanResult(result);
        }
      } catch (err: unknown) {
        showErrorToast(scanErrorMessage(err, code));
      } finally {
        setProcessing(false);
      }
    },
    [processing, manualModalVisible, router, showErrorToast]
  );

  const runScanAction = useCallback(
    async (action: ScanAction) => {
      setActionRunning(true);
      try {
        await scanService.runAction(action);
        setSuccessMessage(
          action.key === 'pickup-attach'
            ? `Colis ajouté au ramassage ${scanResult?.pickup?.referenceNumber ?? ''}`
            : action.key === 'pickup-detach'
              ? 'Colis retiré du ramassage'
              : 'Action enregistrée'
        );
        setScanResult(null);
      } catch (err: unknown) {
        showErrorToast((err as { message?: string })?.message || 'Action impossible.');
      } finally {
        setActionRunning(false);
      }
    },
    [scanResult, showErrorToast]
  );

  // Hook into decoupled useScanner
  const { hasPermission, requestPermission, torchEnabled, toggleTorch, handleBarcodeScanned } =
    useScanner({
      onScan: handleProcessCode,
      cooldownMs: 2000,
    });

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    handleProcessCode(manualCode);
  };

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 230],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ============================================================== */}
      {/* 1. PERMISSION REQUEST VIEW (When permission not yet granted)   */}
      {/* ============================================================== */}
      {hasPermission === false && Platform.OS !== 'web' ? (
        <View style={[styles.permissionContainer, { paddingTop: insets.top + spacing.xl }]}>
          <View style={styles.permissionIconCircle}>
            <Ionicons name="camera-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Accès à la caméra requis</Text>
          <Text style={styles.permissionDescription}>
            Pour scanner rapidement les codes-barres de vos colis, autorisez RUNEX Driver à accéder
            à la caméra de votre téléphone.
          </Text>

          <View style={styles.permissionActions}>
            <PrimaryButton
              title="Autoriser la caméra"
              iconName="camera"
              onPress={requestPermission}
              style={styles.permissionBtn}
            />
            <SecondaryButton
              title="Saisie manuelle du code"
              iconName="keypad-outline"
              variant="dark"
              onPress={() => setManualModalVisible(true)}
              style={styles.permissionBtn}
            />
          </View>
        </View>
      ) : (
        /* ============================================================== */
        /* 2. FULL-BLEED DARK CAMERA VIEW                                 */
        /* ============================================================== */
        <View style={styles.cameraWrapper}>
          {hasPermission ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torchEnabled}
              onBarcodeScanned={processing || scanResult ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                  'code128',
                  'code39',
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'pdf417',
                  'aztec',
                  'datamatrix',
                ],
              }}
            />
          ) : (
            /* Fallback dark camera viewport for web / preview */
            <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholderBackground]} />
          )}

          {/* Dimmed camera overlays for scanning target cut-out */}
          <View style={styles.overlayMaskContainer}>
            {/* Top Header & Tournée Indicator */}
            <View style={[styles.scannerHeader, { paddingTop: Math.max(insets.top + 8, 20) }]}>
              <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>Scanner RUNEX</Text>
                <Text style={styles.headerSubtitle}>
                  {loadingRunsheet
                    ? 'Chargement tournée...'
                    : activeRunsheet?.status === 'active'
                      ? `Tournée active (${activeRunsheet.parcels.length} colis)`
                      : 'Aucune tournée active'}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => router.push('/(tabs)/runsheet')}
                style={styles.headerRunsheetBtn}
              >
                <Ionicons name="list-outline" size={18} color={colors.text.inverse} />
                <Text style={styles.headerRunsheetText}>Liste</Text>
              </TouchableOpacity>
            </View>

            {successMessage && !errorMessage && (
              <View style={styles.inlineToastContainer}>
                <View style={[styles.inlineToast, { backgroundColor: colors.status.success }]}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.text.inverse} />
                  <Text style={styles.inlineToastText}>{successMessage}</Text>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => setSuccessMessage(null)}>
                    <Ionicons name="close" size={18} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* INLINE ERROR TOAST: refus du scan */}
            {errorMessage && (
              <View style={styles.inlineToastContainer}>
                <View style={styles.inlineToast}>
                  <Ionicons name="alert-circle" size={20} color={colors.text.inverse} />
                  <Text style={styles.inlineToastText}>{errorMessage}</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setErrorMessage(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={18} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Target Area Container */}
            <View style={styles.targetContainer}>
              {/* Caption above frame */}
              <View style={styles.captionBadge}>
                <Ionicons name="scan-outline" size={16} color={colors.primary} />
                <Text style={styles.captionText}>Placez le code-barres dans le cadre</Text>
              </View>

              {/* Corner-Bracket Frame Box */}
              <View style={styles.scanFrame}>
                {/* 4 Corner Brackets */}
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />

                {/* Animated Red Laser Beam */}
                <Animated.View
                  style={[
                    styles.laserLine,
                    {
                      transform: [{ translateY: laserTranslateY }],
                    },
                  ]}
                />

                {/* Central Reticle Aim */}
                <View style={styles.aimCross} />
              </View>

              <Text style={styles.subCaptionText}>
                Détection automatique QR Code, Code 128 & EAN
              </Text>
            </View>

            {/* ============================================================== */}
            {/* 3. CONTROLS BELOW CAMERA FRAME: Flash OFF/ON & Saisie Manuelle */}
            {/* ============================================================== */}
            <View style={styles.controlsRow}>
              {/* Flash OFF / ON Pill Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={toggleTorch}
                style={[styles.pillButton, torchEnabled && styles.pillButtonFlashActive]}
              >
                <Ionicons
                  name={torchEnabled ? 'flash' : 'flash-outline'}
                  size={18}
                  color={torchEnabled ? colors.status.warning : colors.text.inverse}
                />
                <Text style={[styles.pillButtonText, torchEnabled && styles.pillButtonTextActive]}>
                  {torchEnabled ? 'Flash ON' : 'Flash OFF'}
                </Text>
              </TouchableOpacity>

              {/* Saisie Manuelle Pill Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setManualModalVisible(true)}
                style={styles.pillButton}
              >
                <Ionicons name="keypad-outline" size={18} color={colors.text.inverse} />
                <Text style={styles.pillButtonText}>Saisie manuelle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ============================================================== */}
      {/* 4. MODAL: SAISIE MANUELLE DU CODE                              */}
      {/* ============================================================== */}
      <Modal
        visible={manualModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setManualModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setManualModalVisible(false)}
          />

          <View
            style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom + spacing.lg, 24) }]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Saisie manuelle</Text>
                <Text style={styles.modalSubtitle}>Code-barres ou numéro du bon de livraison</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setManualModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Input with clear action */}
            <View style={styles.inputContainer}>
              <Ionicons
                name="barcode-outline"
                size={20}
                color={colors.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Ex: 261008000000012"
                placeholderTextColor={colors.text.muted}
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="characters"
                testID="manual-code-input"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleManualSubmit}
              />
              {manualCode.length > 0 && (
                <TouchableOpacity activeOpacity={0.7} onPress={() => setManualCode('')}>
                  <Ionicons name="close-circle" size={18} color={colors.text.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Quick chips from active runsheet for effortless testing */}
            {activeRunsheet?.parcels && activeRunsheet.parcels.length > 0 && (
              <View style={styles.quickChipsSection}>
                <Text style={styles.quickChipsTitle}>Colis de votre tournée :</Text>
                <View style={styles.chipsRow}>
                  {activeRunsheet.parcels.slice(0, 4).map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      activeOpacity={0.7}
                      onPress={() => setManualCode(p.barcode ?? p.code)}
                      style={styles.chipItem}
                    >
                      <Text style={styles.chipText}>{p.barcode ?? p.code}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalActionsRow}>
              <PrimaryButton
                title="Valider et ouvrir"
                iconName="search-outline"
                loading={processing}
                onPress={handleManualSubmit}
                style={styles.modalActionBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 5. RÉSULTAT DU SCAN HORS TOURNÉE (ramassage chez l'expéditeur) */}
      {/* ============================================================== */}
      <Modal
        visible={!!scanResult}
        transparent
        animationType="slide"
        onRequestClose={() => setScanResult(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setScanResult(null)}
          />
          {scanResult && (
            <View
              style={[
                styles.modalSheet,
                { paddingBottom: Math.max(insets.bottom + spacing.lg, 24) },
              ]}
            >
              <View style={styles.sheetHandle} />
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {scanResult.relation === 'PICKUP' ? 'Colis à ramasser' : 'Colis'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    N° {scanResult.parcel.trackingNumber ?? scanResult.parcel.code}
                    {scanResult.piece
                      ? ` · pièce ${scanResult.piece.number}/${scanResult.piece.count}`
                      : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setScanResult(null)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.resultLine}>{scanResult.parcel.shipperName}</Text>
              <Text style={styles.resultMuted}>
                Pour {scanResult.parcel.clientName} — {scanResult.parcel.zoneName}
              </Text>
              <Text style={styles.resultMuted}>
                {scanResult.parcel.pieceCount ?? 1} pièce(s) ·{' '}
                {formatTND(scanResult.parcel.codAmount || 0)}
                {scanResult.parcel.isFragile ? ' · FRAGILE' : ''}
              </Text>
              {scanResult.pickup && (
                <Text style={styles.resultMuted}>
                  Ramassage {scanResult.pickup.referenceNumber}
                  {scanResult.pickup.attached ? ' · déjà ajouté' : ''}
                </Text>
              )}
              <View style={styles.modalActionsRow}>
                {scanResult.actions.map((a) => (
                  <PrimaryButton
                    key={a.key}
                    title={a.label}
                    loading={actionRunning}
                    onPress={() => runScanAction(a)}
                    style={styles.modalActionBtn}
                  />
                ))}
                {scanResult.actions.length === 0 && (
                  <SecondaryButton
                    title="Fermer"
                    onPress={() => setScanResult(null)}
                    style={styles.modalActionBtn}
                  />
                )}
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Persistent Bottom Navigation with Scanner Active */}
      <BottomNav
        activeTab="scanner"
        onTabPress={(tab: BottomNavTab) => {
          if (tab === 'accueil') {
            router.push('/(tabs)/home');
          } else if (tab === 'runsheet') {
            router.push('/(tabs)/runsheet');
          } else if (tab === 'pickup') {
            router.push('/(tabs)/pickup');
          } else if (tab === 'retour') {
            router.push('/(tabs)/retour');
          } else if (tab === 'profil') {
            router.push('/(tabs)/profile');
          }
        }}
        badges={{
          runsheet: activeRunsheet?.parcels?.filter((p) => p.status === 'in_transit').length,
          retour: activeRunsheet?.parcels?.filter((p) => p.status === 'returned').length,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  resultLine: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  resultMuted: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 4,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background.header,
  },

  // Camera viewport
  cameraWrapper: {
    flex: 1,
    backgroundColor: colors.background.header,
    position: 'relative',
  },
  cameraPlaceholderBackground: {
    backgroundColor: colors.surfaceDark,
  },

  // Overlay container over camera feed
  overlayMaskContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
  },

  // Header over camera
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(10, 14, 26, 0.75)',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.inverse,
    fontWeight: '800',
  },
  headerSubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  headerRunsheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
    gap: 6,
  },
  headerRunsheetText: {
    color: colors.text.inverse,
    fontWeight: '700',
    fontSize: 12,
  },

  // INLINE ERROR TOAST: "Colis introuvable dans votre tournée"
  inlineToastContainer: {
    position: 'absolute',
    top: 90,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 99,
  },
  inlineToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.danger,
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: spacing.sm,
    ...shadows.floating,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  inlineToastText: {
    ...typography.bodySmall,
    color: colors.text.inverse,
    fontWeight: '700',
    flex: 1,
  },

  // Frame and Target Area
  targetContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 14, 26, 0.85)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    gap: 6,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  captionText: {
    color: colors.text.inverse,
    fontWeight: '700',
    fontSize: 13,
  },
  subCaptionText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: spacing.md,
    fontSize: 11,
    textAlign: 'center',
  },

  // Corner Bracket Frame (260x260)
  scanFrame: {
    width: 260,
    height: 260,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: colors.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 14,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 14,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 14,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 14,
  },
  laserLine: {
    width: '100%',
    height: 3,
    backgroundColor: colors.primary,
    ...shadows.floating,
  },
  aimCross: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 12,
    height: 12,
    marginLeft: -6,
    marginTop: -6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: radii.full,
  },

  // Controls Row (Below camera frame)
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.pill,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...shadows.card,
  },
  pillButtonFlashActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: colors.status.warning,
  },
  pillButtonText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '700',
  },
  pillButtonTextActive: {
    color: colors.status.warning,
  },

  // Permission Request View
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background.header,
  },
  permissionIconCircle: {
    width: 90,
    height: 90,
    borderRadius: radii.full,
    backgroundColor: 'rgba(227, 30, 43, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(227, 30, 43, 0.3)',
  },
  permissionTitle: {
    ...typography.h2,
    color: colors.text.inverse,
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  permissionDescription: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  permissionActions: {
    width: '100%',
    gap: spacing.sm,
  },
  permissionBtn: {
    width: '100%',
  },

  // Modal: Saisie Manuelle
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    ...shadows.floating,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    fontSize: 20,
    color: colors.text.primary,
    fontWeight: '800',
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.body,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  quickChipsSection: {
    marginBottom: spacing.lg,
  },
  quickChipsTitle: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chipItem: {
    backgroundColor: 'rgba(227, 30, 43, 0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(227, 30, 43, 0.25)',
  },
  chipText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalActionsRow: {
    marginTop: spacing.xs,
  },
  modalActionBtn: {
    width: '100%',
  },
});
