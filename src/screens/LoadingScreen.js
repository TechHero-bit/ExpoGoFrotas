import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import {
    StyleSheet,
    ActivityIndicator,
    Text
} from 'react-native';
import { COLORS, SPACING } from '../theme';

export default function LoadingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator color={COLORS.primary} size="large" />
      <Text style={styles.label}>Aguarde, carregando sua sessão...</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray100,
    padding: SPACING.lg,
  },
  label: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
