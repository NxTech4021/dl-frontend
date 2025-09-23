import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TestNavScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🎯 Navigation Test Success!</Text>
      <Text style={styles.subtitle}>If you see this, navigation is working</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});