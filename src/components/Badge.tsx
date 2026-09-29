import React from 'react';
import { StyleSheet, View, Text, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, typography, radii } from '@/theme';

export type BadgeStatus =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'delivered'
  | 'postponed'
  | 'returned'
  | 'inDelivery'
  | 'relanced';

export interface BadgeProps {
  label: string;
  status?: BadgeStatus;
  dot?: boolean;
  size?: 'sm' | 'md';
  variant?: 'subtle' | 'solid' | 'outline';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

interface StatusColorConfig {
  text: string;
  bg: string;
  border: string;
  dot: string;
}

const statusMap: Record<BadgeStatus, StatusColorConfig> = {
  success: {
    text: colors.status.success,
    bg: colors.statusBg.success,
    border: '#BBF7D0',
    dot: colors.status.success,
  },
  delivered: {
    text: colors.status.success,
    bg: colors.statusBg.success,
    border: '#BBF7D0',
    dot: colors.status.success,
  },
  warning: {
    text: '#B45309',
    bg: colors.statusBg.warning,
    border: '#FDE68A',
    dot: colors.status.warning,
  },
  postponed: {
    text: '#B45309',
    bg: colors.statusBg.warning,
    border: '#FDE68A',
    dot: colors.status.warning,
  },
  danger: {
    text: colors.status.danger,
    bg: colors.statusBg.danger,
    border: '#FECACA',
    dot: colors.status.danger,
  },
  returned: {
    text: colors.status.danger,
    bg: colors.statusBg.danger,
    border: '#FECACA',
    dot: colors.status.danger,
  },
  info: {
    text: colors.status.info,
    bg: colors.statusBg.info,
    border: '#BFDBFE',
    dot: colors.status.info,
  },
  inDelivery: {
    text: colors.status.info,
    bg: colors.statusBg.info,
    border: '#BFDBFE',
    dot: colors.status.info,
  },
  neutral: {
    text: colors.status.neutral,
    bg: colors.statusBg.neutral,
    border: '#DDD6FE',
    dot: colors.status.neutral,
  },
  relanced: {
    text: colors.status.neutral,
    bg: colors.statusBg.neutral,
    border: '#DDD6FE',
    dot: colors.status.neutral,
  },
};

/**
 * Badge Component
 * Small colored status chip (Livré / En livraison / Reporté / Retour / Relance)
 */
export const Badge: React.FC<BadgeProps> = ({
  label,
  status = 'info',
  dot = false,
  size = 'md',
  variant = 'subtle',
  style,
  textStyle,
}) => {
  const config = statusMap[status] || statusMap.info;

  let containerBg = config.bg;
  let textColor = config.text;
  let borderColor = config.border;

  if (variant === 'solid') {
    containerBg = config.dot;
    textColor = colors.text.inverse;
    borderColor = config.dot;
  } else if (variant === 'outline') {
    containerBg = 'transparent';
    textColor = config.text;
    borderColor = config.text;
  }

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        isSmall ? styles.badgeSm : styles.badgeMd,
        {
          backgroundColor: containerBg,
          borderColor,
        },
        style,
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            isSmall ? styles.dotSm : styles.dotMd,
            { backgroundColor: variant === 'solid' ? colors.text.inverse : config.dot },
          ]}
        />
      )}
      <Text
        style={[
          styles.text,
          isSmall ? styles.textSm : styles.textMd,
          { color: textColor },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  badgeMd: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  dot: {
    borderRadius: radii.full,
    marginRight: spacing.xs,
  },
  dotSm: {
    width: 5,
    height: 5,
  },
  dotMd: {
    width: 6,
    height: 6,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  textSm: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 14,
  },
  textMd: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
  },
});
