import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {/* Hide the header for this screen only */}
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator size="large" />
    </View>
  );
}