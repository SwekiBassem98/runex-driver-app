import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { Badge, BadgeStatus } from './Badge';
import { Parcel, ParcelStatus, formatTND } from '@/types';

export interface ParcelListItemProps {
  parcel: Parcel;
  onPress: (parcel: Parcel) => void;
  showReturnReason?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const getParcelStatusBadge = (
  status: ParcelStatus
): { label: string; badgeStatus: BadgeStatus } => {
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
      return { label: 'Retourné', badgeStatus: 'returned' };
    case 'partially_delivered':
      return { label: 'Partiel', badgeStatus: 'warning' };
    case 'exchanged':
      return { label: 'Relancé', badgeStatus: 'neutral' };
    default:
      return { label: status, badgeStatus: 'info' };
  }
};

/**
 * ParcelListItem Component
 * Shared list card item reused across Runsheet, Retours, and Dashboard drilldowns.
 * Displays parcel code, sequence badge, client name, address, phone, COD amount,
 * status badge, and highlights the return reason when present.
 */
export const ParcelListItem: React.FC<ParcelListItemProps> = ({
  parcel,
  onPress,
  showReturnReason = true,
  style,
}) => {
  const badge = getParcelStatusBadge(parcel.status);
  const isReturned = parcel.status === 'returned' || parcel.status === 'cancelled';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(parcel)}
      style={[styles.card, isReturned && styles.cardReturned, style]}
    >
      {/* Top Row: Code, Sequence Order, Status Badge */}
      <View style={styles.headerRow}>
        <View style={styles.codeGroup}>
          <Text style={styles.codeText}>{parcel.code}</Text>
          {parcel.sequenceOrder !== undefined && (
            <View style={styles.seqPill}>
              <Text style={styles.seqPillText}>#{parcel.sequenceOrder}</Text>
            </View>
          )}
        </View>

        <Badge label={badge.label} status={badge.badgeStatus} dot size="sm" />
      </View>

      {/* Client Name */}
      <Text style={styles.clientName} numberOfLines={1}>
        {parcel.clientName}
      </Text>

      {/* Address */}
      <View style={styles.addressRow}>
        <Ionicons
          name="location-outline"
          size={14}
          color={colors.text.secondary}
          style={styles.addressIcon}
        />
        <Text style={styles.addressText} numberOfLines={1}>
          {parcel.address}
        </Text>
      </View>

      {/* Return Reason (highlighted if present) */}
      {showReturnReason && parcel.returnReason && (
        <View style={styles.returnReasonBox}>
          <Ionicons
            name="arrow-undo-outline"
            size={14}
            color={colors.status.danger}
            style={styles.returnReasonIcon}
          />
          <View style={styles.returnReasonContent}>
            <Text style={styles.returnReasonLabel}>Motif de retour :</Text>
            <Text style={styles.returnReasonText} numberOfLines={2}>
              {parcel.returnReason}
            </Text>
          </View>
        </View>
      )}

      {/* Bottom Row: Phone & COD Amount */}
      <View style={styles.footerRow}>
        <View style={styles.phoneGroup}>
          <Ionicons name="call-outline" size={13} color={colors.text.secondary} />
          <Text style={styles.phoneText}>{parcel.clientPhone}</Text>
        </View>

        {parcel.codAmount !== undefined && parcel.codAmount > 0 ? (
          <Text style={styles.codAmountText}>{formatTND(parcel.codAmount)}</Text>
        ) : (
          <Text style={styles.noCodText}>Payé d&apos;avance</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardReturned: {
    borderColor: 'rgba(227, 30, 43, 0.2)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  codeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  codeText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  seqPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  seqPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  clientName: {
    ...typography.h3,
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addressIcon: {
    marginRight: 4,
  },
  addressText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontSize: 13,
    flex: 1,
  },
  returnReasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(227, 30, 43, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(227, 30, 43, 0.2)',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.sm,
    gap: 6,
  },
  returnReasonIcon: {
    marginTop: 1,
  },
  returnReasonContent: {
    flex: 1,
  },
  returnReasonLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.status.danger,
    marginBottom: 1,
  },
  returnReasonText: {
    ...typography.caption,
    color: colors.text.primary,
    fontSize: 12,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  phoneGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  codAmountText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '800',
    color: colors.status.success,
  },
  noCodText: {
    ...typography.caption,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
});
