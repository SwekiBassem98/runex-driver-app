import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  StyleProp,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, shadows } from '@/theme';

export interface ScreenProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  headerContent?: React.ReactNode;
  showHeader?: boolean;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  bottomNav?: React.ReactNode;
}

/**
 * Screen Component
 * Handles the signature RUNEX two-tone layout:
 * - Top header / status bar: Dark near-black navy (#0A0E1A)
 * - Screen content body: Light neutral gray (#F5F6F8)
 * - Safe area insets management for iOS, Android, and Web
 */
export const Screen: React.FC<ScreenProps> = ({
  children,
  title,
  subtitle,
  headerRight,
  headerContent,
  showHeader = true,
  scrollable = true,
  contentContainerStyle,
  style,
  bottomNav,
}) => {
  const insets = useSafeAreaInsets();

  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 12) }]}>
        {headerContent ? (
          headerContent
        ) : title ? (
          <View style={styles.headerRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
            </View>
            {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Light status bar icons on top of dark navy header */}
      <StatusBar style="light" />

      {/* Top Dark Header */}
      {renderHeader()}

      {/* Light Neutral Content Body */}
      <KeyboardAvoidingView
        style={styles.bodyWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scrollable ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              !bottomNav && { paddingBottom: Math.max(insets.bottom, spacing.xl) },
              contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View
            style={[
              styles.fixedContent,
              !bottomNav && { paddingBottom: Math.max(insets.bottom, spacing.xl) },
              contentContainerStyle,
            ]}
          >
            {children}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Optional Persistent Bottom Nav */}
      {bottomNav}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.header, // Keeps top & bottom notch seamless
  },
  headerContainer: {
    backgroundColor: colors.background.header,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    ...shadows.header,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.inverse,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  bodyWrapper: {
    flex: 1,
    backgroundColor: colors.background.body,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background.body,
  },
  scrollContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  fixedContent: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background.body,
  },
});
