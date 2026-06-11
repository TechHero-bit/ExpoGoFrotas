import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    TextInput,
    Alert,
    Image,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { fetchAvailableVeiculos, createJourneyAndCheckin } from '../services/dbService';
import { useJourney } from '../contexts/JourneyContext';

const FUEL_LEVELS = ['Reserva', '1/4', '1/2', '3/4', 'Cheio'];

export default function VehicleCheckinScreen({ navigation }) {
  const [veiculos, setVeiculos] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [kmInicial, setKmInicial] = useState('');
  const [origem, setOrigem] = useState('Depósito Central');
  const [destino, setDestino] = useState('Centro de Distribuição Norte');
  const [combustivel, setCombustivel] = useState('1/2');
  const [selfieUri, setSelfieUri] = useState(null);
  const [placaUri, setPlacaUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const { refreshJourney } = useJourney();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadVeiculos = async () => {
        try {
          setLoading(true);
          const data = await fetchAvailableVeiculos();
          if (isActive) setVeiculos(data || []);
        } catch (loadError) {
          console.warn('Erro ao carregar veículos disponíveis', loadError);
          if (isActive) setError('Não foi possível carregar os veículos disponíveis.');
        } finally {
          if (isActive) setLoading(false);
        }
      };

      loadVeiculos();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const pickImage = async (setter) => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  const handleConfirm = async () => {
    // ============================================
    // VALIDAÇÃO PRÉ-REQUISITOS
    // ============================================
    if (!selectedVehicle) {
      Alert.alert('⚠️ Selecione um veículo', 'Escolha um veículo disponível para iniciar o check-in.');
      return;
    }

    if (!kmInicial.trim()) {
      Alert.alert('⚠️ KM inicial obrigatório', 'Digite o KM atual do veículo antes de prosseguir.');
      return;
    }

    // Validar KM é um número válido
    const kmNumerico = Number(kmInicial);
    if (isNaN(kmNumerico) || kmNumerico < 0) {
      Alert.alert('⚠️ KM inválido', 'Digite um número válido e não-negativo para o KM.');
      return;
    }

    if (!origem.trim()) {
      Alert.alert('⚠️ Origem obrigatória', 'Informe de onde a jornada começará.');
      return;
    }

    if (!destino.trim()) {
      Alert.alert('⚠️ Destino obrigatório', 'Informe para onde a jornada irá.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // ============================================
      // 1. OBTER ID DO USUÁRIO AUTENTICADO
      // ============================================
      console.log('[VehicleCheckin] Obtendo usuário autenticado...');
      const userResponse = await supabase.auth.getUser();
      const usuarioId = userResponse.data?.user?.id;

      if (!usuarioId) {
        console.error('[VehicleCheckin] usuarioId não encontrado:', userResponse);
        throw new Error('Sua sessão expirou. Faça login novamente.');
      }

      console.log('[VehicleCheckin] usuarioId obtido:', usuarioId);

      // ============================================
      // 2. CRIAR JORNADA E CHECK-IN
      // ============================================
      console.log('[VehicleCheckin] Chamando createJourneyAndCheckin...');
      console.log('[VehicleCheckin] selectedVehicle:', selectedVehicle);
      console.log('[VehicleCheckin] veiculoId a enviar:', selectedVehicle.id, 'tipo:', typeof selectedVehicle.id);

      const result = await createJourneyAndCheckin({
        usuarioId,
        veiculoId: selectedVehicle.id,
        kmInicial: kmNumerico,
        nivelCombustivel: combustivel,
        selfieUrl: selfieUri,
        placaUrl: placaUri,
        origem: origem.trim(),
        destino: destino.trim(),
      });

      console.log('[VehicleCheckin] Sucesso! Resultado:', result);

      // ============================================
      // 3. NAVEGAR PARA TELA DE JORNADA EM ANDAMENTO
      // ============================================
      Alert.alert('✅ Sucesso!', 'Jornada iniciada com sucesso!', [
        {
          text: 'OK',
          onPress: async () => {
            setSaving(false);
            setError(null);
            await refreshJourney();
            navigation.navigate('JourneyInProgress');
          },
        },
      ]);
    } catch (saveError) {
      console.error('[VehicleCheckin] Erro ao iniciar jornada:', {
        message: saveError.message,
        stack: saveError.stack,
      });

      // ============================================
      // TRATAMENTO DE ERRO COM MENSAGENS CLARAS
      // ============================================
      let errorMessage = 'Falha ao iniciar a jornada.';

      // Erro de autenticação
      if (saveError.message?.includes('Usuário não autenticado') || saveError.message?.includes('sessão expirou')) {
        errorMessage = 'Sua sessão expirou. Faça login novamente.';
      }
      // Erro de validação de entrada
      else if (saveError.message?.includes('usuarioId')) {
        errorMessage = 'Erro de autenticação. Faça login novamente.';
      }
      else if (saveError.message?.includes('veículo')) {
        errorMessage = 'Veículo selecionado é inválido. Escolha outro.';
      }
      else if (saveError.message?.includes('KM')) {
        errorMessage = 'KM inicial deve ser um número válido.';
      }
      else if (saveError.message?.includes('Origem')) {
        errorMessage = 'Origem da jornada é obrigatória.';
      }
      else if (saveError.message?.includes('Destino')) {
        errorMessage = 'Destino da jornada é obrigatório.';
      }
      // Erro de foreign key
      else if (saveError.message?.includes('foreign key')) {
        errorMessage = 'Usuário ou veículo não encontrado. Tente fazer login novamente.';
      }
      // Erro de constraint
      else if (saveError.message?.includes('constraint')) {
        errorMessage = 'Violação de regra do banco de dados. Contate o suporte.';
      }
      // Erro de conexão
      else if (saveError.message?.includes('network') || saveError.message?.includes('connection')) {
        errorMessage = 'Erro de conexão com o servidor. Verifique sua internet.';
      }
      // Usar mensagem original se disponível
      else if (saveError.message) {
        errorMessage = saveError.message;
      }

      setError(errorMessage);

      // Exibir alert com opção de retry
      Alert.alert('❌ Erro ao iniciar jornada', errorMessage, [
        {
          text: 'Tentar novamente',
          onPress: () => {
            setError(null);
          },
        },
        {
          text: 'Cancelar',
          onPress: () => {
            setError(null);
          },
          style: 'cancel',
        },
      ]);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Check-in do Veículo</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Veículos Disponíveis</Text>
        {veiculos.length ? (
          veiculos.map((veiculo) => (
            <TouchableOpacity
              key={veiculo.id}
              style={[styles.vehicleCard, selectedVehicle?.id === veiculo.id && styles.vehicleCardSelected]}
              onPress={() => setSelectedVehicle(veiculo)}
            >
              <View>
                <Text style={styles.vehicleModel}>{veiculo.modelo}</Text>
                <Text style={styles.vehiclePlate}>{veiculo.placa}</Text>
              </View>
              <Text style={styles.vehicleStatus}>{veiculo.status}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>Não há veículos disponíveis no momento.</Text>
        )}

        {selectedVehicle && (
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Origem</Text>
            <TextInput
              value={origem}
              onChangeText={setOrigem}
              placeholder="Origem da jornada"
              style={styles.input}
            />

            <Text style={styles.formLabel}>Destino</Text>
            <TextInput
              value={destino}
              onChangeText={setDestino}
              placeholder="Destino da jornada"
              style={styles.input}
            />

            <Text style={styles.formLabel}>KM Inicial</Text>
            <TextInput
              value={kmInicial}
              onChangeText={setKmInicial}
              keyboardType="numeric"
              placeholder="Ex: 49876"
              style={styles.input}
            />

            <Text style={styles.formLabel}>Nível de Combustível</Text>
            <View style={styles.fuelRow}>
              {FUEL_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.fuelOption, combustivel === level && styles.fuelOptionActive]}
                  onPress={() => setCombustivel(level)}
                >
                  <Text style={[styles.fuelOptionText, combustivel === level && styles.fuelOptionTextActive]}>{level}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Comprovante</Text>
            <View style={styles.photoPickerRow}>
              <TouchableOpacity style={styles.photoCard} onPress={() => pickImage(setSelfieUri)} activeOpacity={0.85}>
                {selfieUri ? <Image source={{ uri: selfieUri }} style={styles.photoPreview} /> : <Ionicons name="camera-outline" size={28} color={COLORS.gray500} />}
                <Text style={styles.photoLabel}>Selfie</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoCard} onPress={() => pickImage(setPlacaUri)} activeOpacity={0.85}>
                {placaUri ? <Image source={{ uri: placaUri }} style={styles.photoPreview} /> : <Ionicons name="car-outline" size={28} color={COLORS.gray500} />}
                <Text style={styles.photoLabel}>Placa</Text>
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.confirmBtn, (!kmInicial.trim() || saving) && styles.btnDisabled]}
              onPress={handleConfirm}
              activeOpacity={0.85}
              disabled={!kmInicial.trim() || saving}
            >
              <Text style={styles.confirmBtnText}>{saving ? 'Iniciando...' : 'Confirmar Check-in'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.gray100 },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xl },
  header: { paddingTop: SPACING.md, paddingHorizontal: SPACING.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  backBtn: { padding: SPACING.xs },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  vehicleCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  vehicleCardSelected: { borderColor: COLORS.primary, borderWidth: 2 },
  vehicleModel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  vehiclePlate: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.xs },
  vehicleStatus: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.md },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formLabel: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.sm },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.gray100,
    color: COLORS.text,
  },
  fuelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.xs },
  fuelOption: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  fuelOptionActive: { backgroundColor: COLORS.primary },
  fuelOptionText: { fontSize: 12, color: COLORS.textSecondary },
  fuelOptionTextActive: { color: COLORS.white },
  photoPickerRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  photoCard: {
    flex: 1,
    minHeight: 112,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    padding: SPACING.sm,
  },
  photoLabel: { fontSize: 12, color: COLORS.textSecondary },
  photoPreview: { width: '100%', height: 120, borderRadius: BORDER_RADIUS.md },
  confirmBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  confirmBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  errorText: { color: COLORS.danger, marginTop: SPACING.sm, textAlign: 'center' },
});
