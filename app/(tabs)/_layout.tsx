import { Stack } from 'expo-router';

export default function TabsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="runsheet" />
      <Stack.Screen name="pickup" />
      <Stack.Screen name="scanner" />
      <Stack.Screen name="retour" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
