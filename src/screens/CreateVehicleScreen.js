import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { supabase } from '../services/supabase';
import AdminGuard from '../components/AdminGuard';

function CreateVehicleContent({ navigation }) {
  const [placa, setPlaca] = useState('');
  const [modelo, setModelo] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [kmAtual, setKmAtual] = useState('');
  const [nivelCombustivel, setNivelCombustivel] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!placa.trim() || !modelo.trim() || !localizacao.trim() || !kmAtual.trim() || !nivelCombustivel.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos antes de salvar.');
      return;
    }

    const km = parseInt(kmAtual, 10);
    const combustivel = parseFloat(nivelCombustivel);

    if (isNaN(km) || km < 0) {
      Alert.alert('Valor inválido', 'KM atual deve ser um número positivo.');
      return;
    }
    if (isNaN(combustivel) || combustivel < 0 || combustivel > 100) {
      Alert.alert('Valor inválido', 'Nível de combustível deve ser entre 0 e 100.');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.from('veiculos').insert([
        {
          placa: placa.trim().toUpperCase(),
          modelo: modelo.trim(),
          status: 'Disponível',
          localizacao: localizacao.trim(),
          km_atual: km,
          nivel_combustivel: combustivel,
        },
      ]);

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Placa duplicada', 'Já existe um veículo com esta placa.');
        } else if (error.code === '42501') {
          Alert.alert('Acesso negado', 'Você não tem permissão para criar veículos.');
        } else {
          throw error;
        }
        return;
      }

      Alert.alert('Sucesso! ✅', 'Veículo cadastrado com sucesso.', [
        { text: 'OK', onPress: () => navigation?.goBack() },
      ]);
    } catch (err) {
      console.error('Erro ao cadastrar veículo:', err);
      Alert.alert('Erro', 'Não foi possível cadastrar o veículo. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Novo Veículo</Text>
              <Text style={styles.subtitle}>Cadastrar um veículo na frota</Text>
            </View>
          </View>

          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.white} />
            <Text style={styles.adminBadgeText}>Área Administrativa</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.field}>
              <Text style={styles.label}>Placa *</Text>
              <TextInput
                style={styles.input}
                placeholder="ABC-1D23"
                placeholderTextColor={COLORS.gray400}
                value={placa}
                onChangeText={setPlaca}
                autoCapitalize="characters"
                maxLength={8}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Modelo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Fiat Ducato 2024"
                placeholderTextColor={COLORS.gray400}
                value={modelo}
                onChangeText={setModelo}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Localização *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Pátio Central — SP"
                placeholderTextColor={COLORS.gray400}
                value={localizacao}
                onChangeText={setLocalizacao}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>KM Atual *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={COLORS.gray400}
                  value={kmAtual}
                  onChangeText={setKmAtual}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Combustível (%) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="100"
                  placeholderTextColor={COLORS.gray400}
                  value={nivelCombustivel}
                  onChangeText={setNivelCombustivel}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                <Text style={styles.saveButtonText}>Cadastrar Veículo</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function CreateVehicleScreen({ navigation }) {
  return (
    <AdminGuard navigation={navigation}>
      <CreateVehicleContent navigation={navigation} />
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray100 },
  scrollContent: { padding: SPACING.md, gap: SPACING.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
  },
  adminBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  field: { gap: SPACING.xs },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
