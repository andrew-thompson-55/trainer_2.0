import { Stack } from 'expo-router';
// app/index.tsx
import { Redirect } from 'expo-router';
import { useAuth } from '../context/auth';

export default function Index() {
  const { user, isLoading } = useAuth();
  // <Stack.Screen options={{ headerShown: false }} />

  if (isLoading) return <LoadingSpinner />; // Or your splash screen

  // If logged in -> Go Home
  if (user) return <Redirect href="/(tabs)/home" />;

  // If not logged in -> Go Login
  return <Redirect href="/(auth)/login" />;
}