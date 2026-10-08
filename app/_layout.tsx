import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/auth.store';

export default function RootLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const segments = useSegments();
  const router = useRouter();

  // Session relue depuis le trousseau du téléphone au démarrage.
  useEffect(() => {
    void useAuthStore.getState().hydrate();
  }, []);

  // Session expirée (ou déconnexion) : retour à l'écran de connexion, où qu'on soit.
  useEffect(() => {
    if (!hydrated) return;
    const first = segments[0] as string | undefined;
    const inAuth = first === '(auth)' || first === 'login' || first === '_dev';
    if (!isAuthenticated && !inAuth && first !== undefined) {
      router.replace('/(auth)/login');
    }
  }, [hydrated, isAuthenticated, segments, router]);

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0A0A',
        }}
      >
        <StatusBar style="light" />
        <ActivityIndicator color="#E31E2B" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="runsheet/[id]" />
        <Stack.Screen name="profile/zones" />
        <Stack.Screen name="_dev/components" />
      </Stack>
    </>
  );
}
