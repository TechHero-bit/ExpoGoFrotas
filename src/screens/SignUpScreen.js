import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { signUp } from '../services/authService';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[0-9]{10,15}$/;

function validatePassword(password) {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

function formatErrorMessage(error) {
  if (!error) return 'Ocorreu um problema inesperado. Tente novamente.';
  if (error.status === 400) return 'Por favor, verifique os dados informados.';
  if (error.message?.includes('duplicate key value')) return 'Este e-mail já está em uso.';
  return error.message || 'Falha no cadastro. Tente novamente.';
}

export default function SignUpScreen({ navigation }) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isFormValid =
    nome.trim().length >= 3 &&
    emailRegex.test(email) &&
    phoneRegex.test(telefone) &&
    validatePassword(password);

  const handleSignUp = async () => {
    if (!nome.trim()) {
      setErrorMessage('Informe seu nome completo.');
      return;
    }
    if (!emailRegex.test(email)) {
      setErrorMessage('Informe um e-mail válido.');
      return;
    }
    if (!phoneRegex.test(telefone)) {
      setErrorMessage('Informe o telefone no formato internacional, apenas números.');
      return;
    }
    if (!validatePassword(password)) {
      setErrorMessage('A senha precisa ter ao menos 8 caracteres, uma letra maiúscula e um número.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      await signUp({ nome: nome.trim(), telefone: telefone.trim(), email: email.trim().toLowerCase(), password });
      Alert.alert(
        'Cadastro Concluído',
        'Sua conta foi criada com sucesso. Verifique seu e-mail e faça login.',
        [{ text: 'OK', onPress: () => navigation.navigate('SignIn') }]
      );
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
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Cadastre-se para acessar o sistema de gestão de frota.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={nome}
              onChangeText={setNome}
              placeholder="Nome completo"
              autoCapitalize="words"
              textContentType="name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone</Text>
            <TextInput
              style={styles.input}
              value={telefone}
              onChangeText={setTelefone}
              placeholder="5511987654321"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
            />
          </View>

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
              textContentType="newPassword"
            />
          </View>

          <Text style={styles.hintText}>Senha com ao menos 8 caracteres, uma letra maiúscula e um número.</Text>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <TouchableOpacity
            style={[styles.button, !isFormValid && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={!isFormValid || loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Criando conta...' : 'Cadastrar'}</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Já tem conta?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text style={styles.footerAction}>Entrar</Text>
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
  hintText: { fontSize: 12, color: COLORS.gray500, marginBottom: SPACING.md },
  button: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: COLORS.gray400 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  errorText: { color: COLORS.danger, marginTop: SPACING.sm, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xs, marginTop: SPACING.lg },
  footerText: { color: COLORS.textSecondary },
  footerAction: { color: COLORS.primary, fontWeight: '700' },
});
