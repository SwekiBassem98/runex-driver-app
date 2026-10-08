import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { Badge, BadgeStatus, PrimaryButton, SecondaryButton, ErrorBanner } from '@/components';
import { runsheetsService } from '@/services/runsheets.service';
import { Parcel, ParcelStatus, ApiError, formatTND } from '@/types';

/**
 * Parcel Detail Screen
 * Route: /app/runsheet/[id].tsx (accessible via /runsheet/[id])
 *
 * Implements real parcel actions:
 * - deliverParcel ("Marquer comme livré")
 * - partialDelivery ("Livraison partielle") -> tests 403 permission handling
 * - postponeParcel ("Reporter") -> tests 403 permission handling
 * - returnParcel ("Retourner" with reason modal)
 */
export default function ParcelDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, piece, count } = useLocalSearchParams<{
    id: string;
    piece?: string;
    count?: string;
  }>();
  // Pièce lue sur le bon de livraison (scan d'une étiquette « …-2 »).
  const scannedPiece = piece ? { number: Number(piece), count: Number(count) || undefined } : null;

  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  // Modals for actions
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [returnReason, setReturnReason] = useState('Client injoignable');

  const [postponeModalVisible, setPostponeModalVisible] = useState(false);
  const [postponeReason, setPostponeReason] = useState('Client absent');

  const [partialModalVisible, setPartialModalVisible] = useState(false);
  const [partialQuantity, setPartialQuantity] = useState('1');
  const [partialAmount, setPartialAmount] = useState('');
  const [partialReason, setPartialReason] = useState('Articles partiels acceptés');

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    runsheetsService
      .getParcelById(id)
      .then((data) => {
        if (isMounted) {
          setParcel(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) setError(err as ApiError);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleCall = () => {
    if (!parcel?.clientPhone) return;
    const cleanPhone = parcel.clientPhone.replace(/\s+/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const handleDeliver = async () => {
    if (!parcel || actionLoading) return;
    setActionLoading('deliver');
    setError(null);
    try {
      await runsheetsService.deliverParcel(parcel.id, {
        notes: 'Livraison confirmée par le livreur',
      });
      // Pop back after successful delivery
      router.back();
    } catch (err: unknown) {
      setError(err as ApiError);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReturn = async () => {
    if (!parcel || !returnReason.trim()) return;
    setActionLoading('return');
    setError(null);
    setReturnModalVisible(false);
    try {
      await runsheetsService.returnParcel(parcel.id, {
        reason: returnReason.trim(),
      });
      router.back();
    } catch (err: unknown) {
      setError(err as ApiError);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmPostpone = async () => {
    if (!parcel || !postponeReason.trim()) return;
    setActionLoading('postpone');
    setError(null);
    setPostponeModalVisible(false);
    try {
      await runsheetsService.postponeParcel(parcel.id, {
        reason: postponeReason.trim(),
        nextDeliveryDate: '2026-09-30',
      });
      router.back();
    } catch (err: unknown) {
      setError(err as ApiError);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmPartial = async () => {
    if (!parcel) return;
    setActionLoading('partial');
    setError(null);
    setPartialModalVisible(false);
    try {
      await runsheetsService.partialDelivery(parcel.id, {
        deliveredQuantity: parseInt(partialQuantity, 10) || 1,
        amountCollected: Number(partialAmount.replace(',', '.')) || 0,
        reason: partialReason.trim(),
      });
      router.back();
    } catch (err: unknown) {
      setError(err as ApiError);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: ParcelStatus): { label: string; badgeStatus: BadgeStatus } => {
    switch (status) {
      case 'delivered':
        return { label: 'Livré', badgeStatus: 'delivered' };
      case 'in_transit':
      case 'assigned':
      case 'pending':
        return { label: 'En livraison', badgeStatus: 'inDelivery' };
      case 'postponed':
        return { label: 'Reporté', badgeStatus: 'postponed' };
      case 'returned':
      case 'cancelled':
        return { label: 'Retour', badgeStatus: 'returned' };
      case 'partially_delivered':
        return { label: 'Partiel', badgeStatus: 'warning' };
      case 'exchanged':
        return { label: 'Relancé', badgeStatus: 'neutral' };
      default:
        return { label: status, badgeStatus: 'info' };
    }
  };

  const is403 = error?.status === 403;
  // Actions de livraison : seulement sur un colis qui attend encore le livreur.
  const actionable = !!parcel && (parcel.status === 'in_transit' || parcel.status === 'postponed');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + spacing.xs, 16) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.inverse} />
          </TouchableOpacity>

          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>{parcel?.code || 'Détails du colis'}</Text>
            {parcel?.zoneName && <Text style={styles.headerSubtitle}>{parcel.zoneName}</Text>}
          </View>

          {parcel && (
            <Badge
              label={getStatusBadge(parcel.status).label}
              status={getStatusBadge(parcel.status).badgeStatus}
              dot
              size="sm"
            />
          )}
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Chargement du colis...</Text>
          </View>
        ) : !parcel ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Colis introuvable</Text>
            <SecondaryButton title="Retour" onPress={() => router.back()} fullWidth={false} />
          </View>
        ) : (
          <>
            {/* Error Banner: handles 403 permission refusal vs network failure */}
            {error && (
              <ErrorBanner
                type={is403 ? 'permission' : 'network'}
                code={error.code || `${error.status || 'ERR'}`}
                title={is403 ? 'Autorisation requise' : 'Erreur'}
                message={
                  error.message ||
                  (is403
                    ? 'Cette action nécessite une autorisation supplémentaire — contactez votre gestionnaire.'
                    : 'Une erreur est survenue lors du traitement.')
                }
                onDismiss={() => setError(null)}
                style={styles.errorBanner}
              />
            )}

            {/* Pièce scannée + identité du colis (bon de livraison) */}
            {(scannedPiece || parcel.trackingNumber) && (
              <View style={styles.card}>
                {scannedPiece && (
                  <View style={styles.pieceBanner} testID="piece-banner">
                    <Ionicons name="cube-outline" size={18} color={colors.text.inverse} />
                    <Text style={styles.pieceBannerText}>
                      Pièce {scannedPiece.number}
                      {scannedPiece.count ? ` / ${scannedPiece.count}` : ''} scannée
                    </Text>
                  </View>
                )}
                {parcel.trackingNumber && (
                  <Text style={styles.factLine}>
                    N° {parcel.trackingNumber}
                    {parcel.pieceCount ? ` · ${parcel.pieceCount} pièce(s)` : ''}
                  </Text>
                )}
                {parcel.backendStatusLabel && (
                  <Text style={styles.factMuted}>Statut : {parcel.backendStatusLabel}</Text>
                )}
                {parcel.shipperName && (
                  <Text style={styles.factMuted}>Expéditeur : {parcel.shipperName}</Text>
                )}
                {parcel.contentSummary && (
                  <Text style={styles.factMuted}>Contenu : {parcel.contentSummary}</Text>
                )}
                {(parcel.isFragile || parcel.allowOpen) && (
                  <View style={styles.flagsRow}>
                    {parcel.isFragile && <Badge label="FRAGILE" status="warning" size="sm" />}
                    {parcel.allowOpen && (
                      <Badge label="Ouverture autorisée" status="info" size="sm" />
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Client Information Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionTitle}>Destinataire</Text>
                {parcel.sequenceOrder && (
                  <View style={styles.seqPill}>
                    <Text style={styles.seqPillText}>Ordre #{parcel.sequenceOrder}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.clientName}>{parcel.clientName}</Text>

              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="call" size={16} color={colors.primary} />
                </View>
                <Text style={styles.infoText}>{parcel.clientPhone}</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleCall}
                  style={styles.callBadgeBtn}
                >
                  <Ionicons name="call" size={14} color={colors.text.inverse} />
                  <Text style={styles.callBadgeText}>Appeler</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="location" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.infoText, { flex: 1 }]}>{parcel.address}</Text>
              </View>

              {parcel.notes && (
                <View style={styles.notesBox}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={colors.text.secondary}
                  />
                  <Text style={styles.notesText}>{parcel.notes}</Text>
                </View>
              )}
            </View>

            {/* Payment & Amount Card */}
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>Paiement à la livraison</Text>
              <View style={styles.codRow}>
                <View>
                  <Text style={styles.codLabel}>Montant à encaisser (COD)</Text>
                  <Text style={styles.codAmount}>{formatTND(parcel.codAmount || 0)}</Text>
                </View>
                <View style={styles.cashModeBadge}>
                  <Ionicons name="cash-outline" size={16} color={colors.cash.green} />
                  <Text style={styles.cashModeText}>Espèces</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons Section */}
            {!actionable ? (
              <View style={styles.card}>
                <Text style={styles.factMuted}>
                  Aucune action de livraison : ce colis est «{' '}
                  {parcel.backendStatusLabel ?? getStatusBadge(parcel.status).label} ».
                </Text>
              </View>
            ) : (
              <View style={styles.actionsSection}>
                <Text style={styles.actionsTitle}>Actions de Livraison</Text>

                {/* 1. Marquer comme livré */}
                <PrimaryButton
                  title="Marquer comme livré"
                  iconName="checkmark-circle-outline"
                  loading={actionLoading === 'deliver'}
                  onPress={handleDeliver}
                  style={styles.actionBtn}
                />

                {/* 2. Livraison partielle */}
                <SecondaryButton
                  title="Livraison partielle"
                  iconName="pie-chart-outline"
                  variant="outline"
                  loading={actionLoading === 'partial'}
                  onPress={() => setPartialModalVisible(true)}
                  style={styles.actionBtn}
                />

                {/* 3. Reporter */}
                <SecondaryButton
                  title="Reporter la livraison"
                  iconName="calendar-outline"
                  variant="outline"
                  loading={actionLoading === 'postpone'}
                  onPress={() => setPostponeModalVisible(true)}
                  style={styles.actionBtn}
                />

                {/* 4. Retourner */}
                <SecondaryButton
                  title="Retourner le colis"
                  iconName="arrow-undo-outline"
                  variant="dark"
                  loading={actionLoading === 'return'}
                  onPress={() => setReturnModalVisible(true)}
                  style={styles.actionBtn}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* MODAL: Retourner le colis (Demande un motif) */}
      {/* ========================================================= */}
      <Modal
        visible={returnModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReturnModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Motif de Retour</Text>
              <TouchableOpacity activeOpacity={0.75} onPress={() => setReturnModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Sélectionnez ou précisez la raison pour laquelle le colis n&apos;a pas pu être livré :
            </Text>

            {/* Common reasons list */}
            {[
              'Client injoignable après relances',
              'Colis refusé - Produit non conforme',
              'Client a annulé la commande',
              'Adresse erronée ou introuvable',
            ].map((reason) => (
              <TouchableOpacity
                key={reason}
                activeOpacity={0.8}
                onPress={() => setReturnReason(reason)}
                style={[
                  styles.reasonOption,
                  returnReason === reason && styles.reasonOptionSelected,
                ]}
              >
                <Ionicons
                  name={returnReason === reason ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={returnReason === reason ? colors.primary : colors.text.secondary}
                />
                <Text
                  style={[styles.reasonText, returnReason === reason && styles.reasonTextSelected]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            <TextInput
              style={styles.modalInput}
              placeholder="Autre motif ou précision..."
              placeholderTextColor={colors.text.muted}
              value={returnReason}
              onChangeText={setReturnReason}
            />

            <View style={styles.modalActionsRow}>
              <SecondaryButton
                title="Annuler"
                onPress={() => setReturnModalVisible(false)}
                fullWidth={false}
                size="sm"
              />
              <PrimaryButton
                title="Confirmer le retour"
                onPress={handleConfirmReturn}
                fullWidth={false}
                size="sm"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: Reporter le colis */}
      {/* ========================================================= */}
      <Modal
        visible={postponeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPostponeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reporter la livraison</Text>
              <TouchableOpacity activeOpacity={0.75} onPress={() => setPostponeModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Indiquez la raison du report demandé par le client :
            </Text>

            {['Client absent', 'Reporté à demain 14h', 'Client demande report fin de semaine'].map(
              (r) => (
                <TouchableOpacity
                  key={r}
                  activeOpacity={0.8}
                  onPress={() => setPostponeReason(r)}
                  style={[styles.reasonOption, postponeReason === r && styles.reasonOptionSelected]}
                >
                  <Ionicons
                    name={postponeReason === r ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={postponeReason === r ? colors.primary : colors.text.secondary}
                  />
                  <Text
                    style={[styles.reasonText, postponeReason === r && styles.reasonTextSelected]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              )
            )}

            <View style={styles.modalActionsRow}>
              <SecondaryButton
                title="Annuler"
                onPress={() => setPostponeModalVisible(false)}
                fullWidth={false}
                size="sm"
              />
              <PrimaryButton
                title="Confirmer le report"
                onPress={handleConfirmPostpone}
                fullWidth={false}
                size="sm"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: Livraison partielle */}
      {/* ========================================================= */}
      <Modal
        visible={partialModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPartialModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Livraison partielle</Text>
              <TouchableOpacity activeOpacity={0.75} onPress={() => setPartialModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Précisez le nombre d&apos;articles livrés et la justification :
            </Text>

            <View style={styles.partialInputGroup}>
              <Text style={styles.partialInputLabel}>Quantité livrée :</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={partialQuantity}
                onChangeText={setPartialQuantity}
              />
            </View>

            <View style={styles.partialInputGroup}>
              <Text style={styles.partialInputLabel}>Montant encaissé (TND) :</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="decimal-pad"
                placeholder="0.000"
                value={partialAmount}
                onChangeText={setPartialAmount}
              />
            </View>

            <View style={styles.partialInputGroup}>
              <Text style={styles.partialInputLabel}>Motif :</Text>
              <TextInput
                style={styles.modalInput}
                value={partialReason}
                onChangeText={setPartialReason}
              />
            </View>

            <View style={styles.modalActionsRow}>
              <SecondaryButton
                title="Annuler"
                onPress={() => setPartialModalVisible(false)}
                fullWidth={false}
                size="sm"
              />
              <PrimaryButton
                title="Confirmer"
                onPress={handleConfirmPartial}
                fullWidth={false}
                size="sm"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pieceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  pieceBannerText: {
    ...typography.body,
    color: colors.text.inverse,
    fontWeight: '700',
  },
  factLine: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
  factMuted: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  flagsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background.body,
  },
  headerContainer: {
    backgroundColor: colors.background.header,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    ...shadows.header,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleGroup: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.inverse,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  errorText: {
    ...typography.h3,
    color: colors.status.danger,
    marginBottom: spacing.md,
  },
  errorBanner: {
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardSectionTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seqPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  seqPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  clientName: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(227, 30, 43, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '500',
  },
  callBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.success,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.pill,
    marginLeft: 'auto',
    gap: 4,
  },
  callBadgeText: {
    color: colors.text.inverse,
    fontSize: 11,
    fontWeight: '700',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    marginTop: spacing.xs,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
  codRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  codLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  codAmount: {
    ...typography.display,
    fontSize: 26,
    lineHeight: 32,
    color: colors.status.success,
    fontWeight: '800',
    marginTop: 2,
  },
  cashModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cash.cardBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.cash.cardBorder,
    gap: 6,
  },
  cashModeText: {
    color: colors.cash.green,
    fontWeight: '700',
    fontSize: 12,
  },
  actionsSection: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionsTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  actionBtn: {
    marginBottom: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.xl,
    ...shadows.floating,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '800',
  },
  modalSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  reasonOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(227, 30, 43, 0.04)',
  },
  reasonText: {
    ...typography.bodySmall,
    color: colors.text.primary,
    flex: 1,
  },
  reasonTextSelected: {
    fontWeight: '700',
    color: colors.primary,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    ...typography.bodySmall,
    color: colors.text.primary,
  },
  partialInputGroup: {
    marginBottom: spacing.xs,
  },
  partialInputLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
