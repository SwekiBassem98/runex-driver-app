import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, spacing, typography, radii } from '@/theme';

export interface PillProps {
  label: string;
  active?: boolean;
  count?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'dark' | 'primary';
}

/**
 * Individual Pill component
 * Renders a rounded filter tab button (pill shape: radii.pill = 999)
 */
export const Pill: React.FC<PillProps> = ({
  label,
  active = false,
  count,
  onPress,
  style,
  variant = 'dark',
}) => {
  const activeBg = variant === 'primary' ? colors.primary : colors.background.header;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.pill,
        active ? { backgroundColor: activeBg, borderColor: activeBg } : styles.pillInactive,
        style,
      ]}
    >
      <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
        {label}
        {count !== undefined ? ` (${count})` : ''}
      </Text>
    </TouchableOpacity>
  );
};

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface SegmentedTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  scrollable?: boolean;
  variant?: 'dark' | 'primary';
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * SegmentedTabs Component
 * Horizontal collection of pills for filtering lists (e.g. Tous / En cours / Effectués)
 */
export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  scrollable = true,
  variant = 'dark',
  style,
  containerStyle,
}) => {
  const renderContent = () => (
    <View style={[styles.tabsRow, containerStyle]}>
      {tabs.map((tab) => (
        <Pill
          key={tab.id}
          label={tab.label}
          count={tab.count}
          active={activeTab === tab.id}
          onPress={() => onTabChange(tab.id)}
          variant={variant}
          style={styles.tabSpacing}
        />
      ))}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, style]}
      >
        {renderContent()}
      </ScrollView>
    );
  }

  return <View style={[styles.wrapper, style]}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  scrollContent: {
    paddingVertical: spacing.xs,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabSpacing: {
    marginRight: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  pillInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  pillText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  pillTextActive: {
    color: colors.text.inverse,
  },
  pillTextInactive: {
    color: colors.text.secondary,
  },
});
