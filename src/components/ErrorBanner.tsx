import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '@/theme';

export type ErrorBannerType = 'permission' | 'network' | 'warning' | 'generic';

export interface ErrorBannerProps {
  type?: ErrorBannerType;
  title?: string;
  message: string;
  code?: string | number; // e.g. 403, 'PERMISSION_DENIED', 'NETWORK_ERROR'
  onRetry?: () => void;
  onDismiss?: () => void;
  actionLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const typeConfigs: Record<
  ErrorBannerType,
  {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    borderColor: string;
    defaultTitle: string;
    badgeLabel: string;
  }
> = {
  permission: {
    icon: 'shield-outline',
    color: colors.status.danger,
    bg: '#FEF2F2',
    borderColor: '#FECACA',
    defaultTitle: 'Action non autorisée',
    badgeLabel: '403 REFUSÉ',
  },
  network: {
    icon: 'cloud-offline-outline',
    color: '#D97706',
    bg: '#FFFBEB',
    borderColor: '#FDE68A',
    defaultTitle: 'Problème de connexion',
    badgeLabel: 'HORS LIGNE',
  },
  warning: {
    icon: 'alert-circle-outline',
    color: colors.status.warning,
    bg: colors.statusBg.warning,
    borderColor: '#FDE68A',
    defaultTitle: 'Avertissement',
    badgeLabel: 'ATTENTION',
  },
  generic: {
    icon: 'alert-circle-outline',
    color: colors.status.danger,
    bg: '#FEF2F2',
    borderColor: '#FECACA',
    defaultTitle: 'Une erreur est survenue',
    badgeLabel: 'ERREUR',
  },
};

/**
 * ErrorBanner Component
 * Inline banner for permission/403 and network errors, reusable across screens.
 * Handles legitimate API permission denials (403) and connectivity failures.
 */
export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  type = 'generic',
  title,
  message,
  code,
  onRetry,
  onDismiss,
  actionLabel,
  style,
}) => {
  const config = typeConfigs[type];
  const headerTitle = title || config.defaultTitle;
  const badgeText = code ? `${code}` : config.badgeLabel;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bg, borderColor: config.borderColor },
        style,
      ]}
    >
      <View style={styles.contentRow}>
        <View style={[styles.iconBox, { backgroundColor: `${config.color}15` }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: config.color }]}>{headerTitle}</Text>
            <View style={[styles.codeBadge, { backgroundColor: config.color }]}>
              <Text style={styles.codeText}>{badgeText}</Text>
            </View>
          </View>
          <Text style={styles.message}>{message}</Text>
        </View>

        {onDismiss ? (
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {onRetry ? (
        <View style={styles.footerRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onRetry}
            style={[styles.retryBtn, { backgroundColor: config.color }]}
          >
            <Ionicons name="refresh-outline" size={14} color={colors.text.inverse} />
            <Text style={styles.retryText}>{actionLabel || 'Réessayer'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.button,
    borderWidth: 1,
    padding: spacing.md,
    marginVertical: spacing.xs,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: 4,
  },
  title: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  codeText: {
    color: colors.text.inverse,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  message: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  closeBtn: {
    marginLeft: spacing.sm,
    padding: 2,
  },
  footerRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  retryText: {
    ...typography.caption,
    color: colors.text.inverse,
    fontWeight: '600',
  },
});
