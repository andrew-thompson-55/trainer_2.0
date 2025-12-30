import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    // This hides the header for ALL screens in the (auth) folder
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}