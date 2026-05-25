import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { supabase } from '../services/supabase';
import { fetchActiveJourney, fetchVeiculoById, finishJourney } from '../services/dbService';

export default function VehicleCheckoutScreen({ navigation }) {
  const [journey, setJourney] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [observations, setObservations] = useState('');
  const [kmFinal, setKmFinal] = useState('');
  const [selfieUri, setSelfieUri] = useState(null);
  const [vehiclePhotoUri, setVehiclePhotoUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadJourney = async () => {
      try {
        const userResponse = await supabase.auth.getUser();
        const usuarioId = userResponse.data?.user?.id;
        if (!usuarioId) return;

        const currentJourney = await fetchActiveJourney(usuarioId);
        setJourney(currentJourney);
        if (currentJourney?.veiculo_id) {
          const currentVehicle = await fetchVeiculoById(currentJourney.veiculo_id);
          setVehicle(currentVehicle);
        }
      } catch (loadError) {
        console.warn('Erro ao carregar jornada', loadError);
        setError('Não foi possível carregar os dados da jornada.');
      } finally {
        setLoading(false);
      }
    };

    loadJourney();
  }, []);

  const pickImage = async (setter) => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  const handleFinish = async () => {
    if (!kmFinal.trim()) {
      Alert.alert('Informe o KM final', 'Digite o KM atual do veículo ao finalizar.');
      return;
    }
    if (!journey) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const userResponse = await supabase.auth.getUser();
      const usuarioId = userResponse.data?.user?.id;
      if (!usuarioId) {
        throw new Error('Usuário não autenticado.');
      }

      await finishJourney({
        jornadaId: journey.id,
        usuarioId,
        veiculoId: journey.veiculo_id,
        kmFinal,
        observacoes: observations,
        selfieUrl: selfieUri,
        veiculoFotoUrl: vehiclePhotoUri,
      });

      Alert.alert('Jornada finalizada', 'O encerramento da jornada foi registrado com sucesso.', [
        { text: 'OK', onPress: () => navigation.navigate('Dashboard') },
      ]);
    } catch (saveError) {
      console.warn('Erro ao finalizar jornada', saveError);
      setError('Erro ao encerrar a jornada. Tente novamente.');
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout do Veículo</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Veículo</Text>
          <Text style={styles.infoText}>{vehicle?.placa ?? '---'} · {vehicle?.modelo ?? '---'}</Text>
          <Text style={styles.infoLabel}>Status da Jornada</Text>
          <Text style={styles.infoText}>{journey?.status ?? '---'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>KM Final</Text>
          <View style={styles.inputRow}>
            <Ionicons name="speedometer-outline" size={20} color={COLORS.gray400} />
            <TextInput
              value={kmFinal}
              onChangeText={setKmFinal}
              placeholder="Ex: 50420"
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Observações</Text>
          <TextInput
            value={observations}
            onChangeText={setObservations}
            placeholder="Descreva avarias, ocorrências ou detalhes adicionais"
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <Text style={styles.sectionTitle}>Fotos de Conferência</Text>
        <View style={styles.photoRow}>
          <TouchableOpacity style={styles.photoCard} onPress={() => pickImage(setSelfieUri)} activeOpacity={0.85}>
            {selfieUri ? <Image source={{ uri: selfieUri }} style={styles.photoPreview} /> : <Ionicons name="camera-outline" size={28} color={COLORS.gray500} />}
            <Text style={styles.photoLabel}>Selfie</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoCard} onPress={() => pickImage(setVehiclePhotoUri)} activeOpacity={0.85}>
            {vehiclePhotoUri ? <Image source={{ uri: vehiclePhotoUri }} style={styles.photoPreview} /> : <Ionicons name="car-outline" size={28} color={COLORS.gray500} />}
            <Text style={styles.photoLabel}>Veículo</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.finishBtn, (!kmFinal.trim() || saving) && styles.btnDisabled]}
          onPress={handleFinish}
          activeOpacity={0.85}
          disabled={!kmFinal.trim() || saving}
        >
          <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
          <Text style={styles.finishBtnText}>{saving ? 'Finalizando...' : 'Finalizar Jornada'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.gray100 },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  backBtn: { padding: SPACING.xs },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  infoLabel: { fontSize: 12, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  infoText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  cardLabel: { fontSize: 13, color: COLORS.textSecondary },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, backgroundColor: COLORS.gray100 },
  input: { flex: 1, fontSize: 14, color: COLORS.text, padding: 0 },
  textArea: { minHeight: 110, paddingTop: SPACING.sm },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  photoRow: { flexDirection: 'row', gap: SPACING.sm },
  photoCard: {
    flex: 1,
    minHeight: 120,
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
  footer: { padding: SPACING.md, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  finishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md },
  finishBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  errorText: { color: COLORS.danger, textAlign: 'center' },
});
