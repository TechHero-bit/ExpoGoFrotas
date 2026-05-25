import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { signIn } from '../services/authService';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatErrorMessage(error) {
  if (!error) return 'Ocorreu um problema inesperado. Tente novamente.';
  if (error.status === 400) return 'E-mail ou senha inválidos. Verifique e tente novamente.';
  if (error.message?.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (error.message?.includes('User not found')) return 'Usuário não encontrado. Verifique o e-mail.';
  return error.message || 'Falha na autenticação. Tente novamente.';
}

export default function SignInScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isFormValid = emailRegex.test(email) && password.length >= 6;

  const handleSignIn = async () => {
    if (!emailRegex.test(email)) {
      setErrorMessage('Informe um e-mail válido.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      await signIn({ email: email.trim().toLowerCase(), password });
      Alert.alert('Bem-vindo', 'Login realizado com sucesso.');
    } catch (error) {
      setErrorMessage(formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.card}>
          <Text style={styles.title}>Acessar Conta</Text>
          <Text style={styles.subtitle}>Use seu e-mail e senha para entrar no sistema.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@empresa.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              textContentType="password"
            />
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <TouchableOpacity
            style={[styles.button, !isFormValid && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={!isFormValid || loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Conectando...' : 'Entrar'}</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ainda não tem conta?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.footerAction}>Cadastrar-se</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray100 },
  content: { flex: 1, justifyContent: 'center', padding: SPACING.lg },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 20,
  },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  inputGroup: { marginBottom: SPACING.md },
  label: { fontSize: 12, color: COLORS.gray600, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    backgroundColor: COLORS.gray100,
  },
  button: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: COLORS.gray400,
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  errorText: { color: COLORS.danger, marginTop: SPACING.sm, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xs, marginTop: SPACING.lg },
  footerText: { color: COLORS.textSecondary },
  footerAction: { color: COLORS.primary, fontWeight: '700' },
});
