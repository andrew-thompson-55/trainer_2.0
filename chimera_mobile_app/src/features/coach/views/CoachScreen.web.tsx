import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CoachScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Coach is available in the mobile app.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#9AA0AB',
    fontSize: 16,
  },
});
