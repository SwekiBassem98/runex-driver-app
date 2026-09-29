import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '@/theme';

export interface BaseButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  iconName?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export interface PrimaryButtonProps extends BaseButtonProps {
  variant?: 'solid' | 'gradient';
}

/**
 * PrimaryButton Component
 * High-impact RUNEX racing red button for main calls-to-action
 */
export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  iconName,
  fullWidth = true,
  size = 'md',
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  const sizeStyle = size === 'sm' ? styles.btnSm : size === 'lg' ? styles.btnLg : styles.btnMd;
  const textSizeStyle =
    size === 'sm' ? styles.textSm : size === 'lg' ? styles.textLg : styles.textMd;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.primaryBtn,
        sizeStyle,
        fullWidth && styles.fullWidth,
        isDisabled && styles.btnDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text.inverse} size="small" />
      ) : (
        <View style={styles.btnContent}>
          {iconName ? (
            <Ionicons
              name={iconName}
              size={size === 'sm' ? 16 : 18}
              color={colors.text.inverse}
              style={styles.iconMarginRight}
            />
          ) : leftIcon ? (
            <View style={styles.iconMarginRight}>{leftIcon}</View>
          ) : null}

          <Text style={[styles.primaryText, textSizeStyle, textStyle]}>{title}</Text>

          {rightIcon ? <View style={styles.iconMarginLeft}>{rightIcon}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

export interface SecondaryButtonProps extends BaseButtonProps {
  variant?: 'outline' | 'dark' | 'ghost';
}

/**
 * SecondaryButton Component
 * Outlined or soft dark surface button for auxiliary actions
 */
export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  variant = 'outline',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  iconName,
  fullWidth = true,
  size = 'md',
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  const sizeStyle = size === 'sm' ? styles.btnSm : size === 'lg' ? styles.btnLg : styles.btnMd;
  const textSizeStyle =
    size === 'sm' ? styles.textSm : size === 'lg' ? styles.textLg : styles.textMd;

  const isDark = variant === 'dark';
  const isGhost = variant === 'ghost';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.secondaryBtn,
        isDark ? styles.darkSecondary : isGhost ? styles.ghostSecondary : styles.outlineSecondary,
        sizeStyle,
        fullWidth && styles.fullWidth,
        isDisabled && styles.btnDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isDark ? colors.text.inverse : colors.text.primary}
          size="small"
        />
      ) : (
        <View style={styles.btnContent}>
          {iconName ? (
            <Ionicons
              name={iconName}
              size={size === 'sm' ? 16 : 18}
              color={isDark ? colors.text.inverse : colors.text.primary}
              style={styles.iconMarginRight}
            />
          ) : leftIcon ? (
            <View style={styles.iconMarginRight}>{leftIcon}</View>
          ) : null}

          <Text
            style={[
              styles.secondaryText,
              isDark ? styles.textWhite : styles.textDark,
              textSizeStyle,
              textStyle,
            ]}
          >
            {title}
          </Text>

          {rightIcon ? <View style={styles.iconMarginLeft}>{rightIcon}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

export interface IconButtonProps {
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'surface' | 'primary' | 'dark';
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * IconButton Component
 * Circular or rounded square action button
 */
export const IconButton: React.FC<IconButtonProps> = ({
  iconName,
  onPress,
  size = 'md',
  variant = 'surface',
  color,
  disabled = false,
  loading = false,
  style,
}) => {
  const isDisabled = disabled || loading;

  const dimension = size === 'sm' ? 34 : size === 'lg' ? 48 : 42;
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 24 : 20;

  let bg: string = colors.surface;
  let iconColor: string = color || colors.text.primary;
  let border: string = colors.border;

  if (variant === 'ghost') {
    bg = 'transparent';
    border = 'transparent';
  } else if (variant === 'primary') {
    bg = colors.primary;
    iconColor = color || colors.text.inverse;
    border = colors.primary;
  } else if (variant === 'dark') {
    bg = colors.background.header;
    iconColor = color || colors.text.inverse;
    border = 'rgba(255, 255, 255, 0.15)';
  }

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.iconButton,
        {
          width: dimension,
          height: dimension,
          backgroundColor: bg,
          borderColor: border,
          borderRadius: radii.pill,
        },
        variant === 'surface' && shadows.subtle,
        isDisabled && styles.btnDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <Ionicons name={iconName} size={iconSize} color={iconColor} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  secondaryBtn: {
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.2,
    borderColor: colors.border,
  },
  darkSecondary: {
    backgroundColor: colors.background.header,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  ghostSecondary: {
    backgroundColor: 'transparent',
  },
  fullWidth: {
    width: '100%',
  },
  btnSm: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  btnMd: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  btnLg: {
    minHeight: 54,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: colors.text.inverse,
    ...typography.body,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryText: {
    ...typography.body,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  textWhite: {
    color: colors.text.inverse,
  },
  textDark: {
    color: colors.text.primary,
  },
  textSm: {
    fontSize: 13,
    lineHeight: 18,
  },
  textMd: {
    fontSize: 15,
    lineHeight: 22,
  },
  textLg: {
    fontSize: 16,
    lineHeight: 24,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  iconMarginRight: {
    marginRight: spacing.sm,
  },
  iconMarginLeft: {
    marginLeft: spacing.sm,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
