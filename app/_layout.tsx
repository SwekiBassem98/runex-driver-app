import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme';

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.brandTitle}>RUNEX</Text>
        <Text style={styles.brandSubtitle}>Driver Application</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  brandTitle: {
    fontSize: typography.fontSize.display,
    fontWeight: typography.fontWeight.heavy,
    letterSpacing: 4,
    color: colors.primary,
  },
  brandSubtitle: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
