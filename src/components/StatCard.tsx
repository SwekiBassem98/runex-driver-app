import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '@/theme';

export type StatCardVariant =
  'total' | 'inDelivery' | 'delivered' | 'postponed' | 'returned' | 'relanced' | 'custom';

export interface StatCardProps {
  label: string;
  value: number | string;
  variant?: StatCardVariant;
  iconName?: string;
  iconLibrary?: 'ionicons' | 'material';
  customIcon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  onPress?: () => void;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const variantStyles: Record<
  StatCardVariant,
  {
    bg: string;
    iconColor: string;
    defaultIcon: string;
    library: 'ionicons' | 'material';
  }
> = {
  total: {
    bg: colors.statusBg.info,
    iconColor: colors.status.info,
    defaultIcon: 'cube',
    library: 'ionicons',
  },
  inDelivery: {
    bg: '#FFEDD5',
    iconColor: '#EA580C',
    defaultIcon: 'time',
    library: 'ionicons',
  },
  delivered: {
    bg: colors.statusBg.success,
    iconColor: colors.status.success,
    defaultIcon: 'checkmark-circle',
    library: 'ionicons',
  },
  postponed: {
    bg: colors.statusBg.warning,
    iconColor: colors.status.warning,
    defaultIcon: 'calendar',
    library: 'ionicons',
  },
  returned: {
    bg: colors.statusBg.danger,
    iconColor: colors.status.danger,
    defaultIcon: 'arrow-undo',
    library: 'ionicons',
  },
  relanced: {
    bg: colors.statusBg.neutral,
    iconColor: colors.status.neutral,
    defaultIcon: 'sync',
    library: 'ionicons',
  },
  custom: {
    bg: colors.statusBg.info,
    iconColor: colors.primary,
    defaultIcon: 'flash',
    library: 'ionicons',
  },
};

/**
 * StatCard Component
 * Displays a metric card for the 2-column driver runsheet dashboard:
 * - Colored soft-bg circle with icon
 * - Metric label (e.g., "Total colis", "En livraison", "Livrés")
 * - Big bold counter (statNumber)
 * - Built-in skeleton loading state
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  variant = 'total',
  iconName,
  iconLibrary,
  customIcon,
  iconBgColor,
  iconColor,
  onPress,
  loading = false,
  style,
}) => {
  const config = variantStyles[variant];
  const bg = iconBgColor || config.bg;
  const icColor = iconColor || config.iconColor;
  const icName = iconName || config.defaultIcon;
  const library = iconLibrary || config.library;

  const renderIcon = () => {
    if (customIcon) return customIcon;
    if (library === 'material') {
      return (
        <MaterialCommunityIcons
          name={icName as keyof typeof MaterialCommunityIcons.glyphMap}
          size={20}
          color={icColor}
        />
      );
    }
    return <Ionicons name={icName as keyof typeof Ionicons.glyphMap} size={20} color={icColor} />;
  };

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress}
      disabled={!onPress || loading}
      style={[styles.card, style]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: bg }]}>{renderIcon()}</View>
        <Text style={styles.label} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
          {label}
        </Text>
      </View>

      {loading ? (
        <View style={styles.skeletonValue} />
      ) : (
        <Text style={styles.valueNumber}>{value}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: '500',
    flex: 1,
  },
  valueNumber: {
    ...typography.statNumber,
    color: colors.text.primary,
  },
  skeletonValue: {
    width: 60,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
});
