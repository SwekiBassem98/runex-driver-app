import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii, shadows } from '@/theme';

export type BottomNavTab = 'accueil' | 'runsheet' | 'scanner' | 'pickup' | 'retour' | 'profil';

export interface BottomNavProps {
  activeTab: BottomNavTab;
  onTabPress: (tab: BottomNavTab) => void;
  style?: StyleProp<ViewStyle>;
  badges?: Partial<Record<BottomNavTab, number>>;
}

interface NavItemConfig {
  key: BottomNavTab;
  label: string;
  iconName: string;
  activeIconName: string;
  library: 'ionicons' | 'material';
  isCenter?: boolean;
}

const navItems: NavItemConfig[] = [
  {
    key: 'accueil',
    label: 'Accueil',
    iconName: 'home-outline',
    activeIconName: 'home',
    library: 'ionicons',
  },
  {
    key: 'runsheet',
    label: 'Runsheet',
    iconName: 'document-text-outline',
    activeIconName: 'document-text',
    library: 'ionicons',
  },
  {
    key: 'scanner',
    label: 'Scanner',
    iconName: 'scan-outline',
    activeIconName: 'scan',
    library: 'ionicons',
    isCenter: true,
  },
  {
    key: 'pickup',
    label: 'Pickup',
    iconName: 'cube-outline',
    activeIconName: 'cube',
    library: 'ionicons',
  },
  {
    key: 'retour',
    label: 'Retour',
    iconName: 'swap-horizontal',
    activeIconName: 'swap-horizontal',
    library: 'material',
  },
  {
    key: 'profil',
    label: 'Profil',
    iconName: 'person-outline',
    activeIconName: 'person',
    library: 'ionicons',
  },
];

/**
 * BottomNav Component
 * Signature RUNEX 6-tab navigation bar with dark navy background and elevated Scanner center button:
 * - Tabs: Accueil, Runsheet, Scanner (center), Pickup, Retour, Profil
 * - Active state highlighted in primary RUNEX red (#E31E2B)
 */
export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabPress, style, badges }) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  const renderIcon = (item: NavItemConfig, isActive: boolean) => {
    const iconColor = isActive ? colors.primary : '#64748B';
    const name = isActive ? item.activeIconName : item.iconName;

    if (item.library === 'material') {
      return (
        <MaterialCommunityIcons
          name={name as keyof typeof MaterialCommunityIcons.glyphMap}
          size={item.isCenter ? 26 : 22}
          color={iconColor}
        />
      );
    }
    return (
      <Ionicons
        name={name as keyof typeof Ionicons.glyphMap}
        size={item.isCenter ? 26 : 22}
        color={iconColor}
      />
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }, style]}>
      <View style={styles.contentRow}>
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          const badgeCount = badges?.[item.key];

          if (item.isCenter) {
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.85}
                onPress={() => onTabPress(item.key)}
                style={styles.centerItemWrapper}
              >
                <View
                  style={[
                    styles.centerButton,
                    isActive ? styles.centerButtonActive : styles.centerButtonInactive,
                  ]}
                >
                  <Ionicons
                    name="scan-outline"
                    size={26}
                    color={isActive ? colors.text.inverse : '#94A3B8'}
                  />
                  {badgeCount ? (
                    <View style={styles.badgeCountBadge}>
                      <Text style={styles.badgeText}>{badgeCount}</Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.label,
                    isActive ? styles.activeLabel : styles.inactiveLabel,
                    styles.centerLabel,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.7}
              onPress={() => onTabPress(item.key)}
              style={styles.navItem}
            >
              <View style={styles.iconContainer}>
                {renderIcon(item, isActive)}
                {badgeCount ? (
                  <View style={styles.badgeDot}>
                    <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[styles.label, isActive ? styles.activeLabel : styles.inactiveLabel]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.nav,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    ...shadows.header,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.xs + 2,
    height: 56,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  iconContainer: {
    position: 'relative',
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerItemWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14, // Slightly elevated center button
  },
  centerButton: {
    width: 46,
    height: 46,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  centerButtonActive: {
    backgroundColor: colors.primary,
    borderColor: '#FF4D5A',
    ...shadows.floating,
  },
  centerButtonInactive: {
    backgroundColor: '#161F33',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  label: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  centerLabel: {
    marginTop: 3,
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
  inactiveLabel: {
    color: '#64748B',
  },
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.primary,
    minWidth: 16,
    height: 16,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeCountBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.primaryDark,
    minWidth: 16,
    height: 16,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: 9,
    fontWeight: '700',
  },
});
