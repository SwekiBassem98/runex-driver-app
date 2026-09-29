import React from 'react';
import { StyleSheet, View, Text, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, typography } from '@/theme';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Geometric Isometric Package Cube (matches RUNEX screenshots)
 */
const IsometricBoxIcon = ({ size = 72, color = '#94A3B8' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    {/* Top face */}
    <Path
      d="M32 6L54 18.5L32 31L10 18.5L32 6Z"
      stroke={color}
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Left face */}
    <Path
      d="M10 20.5V44.5L32 57V33"
      stroke={color}
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Right face */}
    <Path
      d="M54 20.5V44.5L32 57V33"
      stroke={color}
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * EmptyState Component
 * Displays centered icon + message for empty lists
 * Examples: "Aucun pickup prévu", "Aucun colis trouvé"
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconWrapper}>
        {icon || <IsometricBoxIcon size={80} color="#94A3B8" />}
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {action ? <View style={styles.actionWrapper}>{action}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
    paddingHorizontal: spacing.xl,
  },
  iconWrapper: {
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.text.secondary,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  description: {
    ...typography.bodySmall,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 280,
  },
  actionWrapper: {
    marginTop: spacing.lg,
  },
});
