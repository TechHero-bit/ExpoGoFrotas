import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
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
import { supabase } from '../services/supabase';
import { fetchActiveJourney, fetchVeiculoById, finishJourney } from '../services/dbService';
import { useJourney } from '../contexts/JourneyContext';
import RouteMap from '../components/RouteMap';
import { fetchRoute, getJourneyRoutePoint, resolveJourneyRoutePoint } from '../services/osrmService';

export default function VehicleCheckoutScreen({ navigation }) {
  const [journey, setJourney] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [observations, setObservations] = useState('');
  const [kmFinal, setKmFinal] = useState('');
  const [combustivel, setCombustivel] = useState('');
  const [selfieUri, setSelfieUri] = useState(null);
  const [frenteUri, setFrenteUri] = useState(null);
  const [lateralEsqUri, setLateralEsqUri] = useState(null);
  const [lateralDirUri, setLateralDirUri] = useState(null);
  const [traseiraUri, setTraseiraUri] = useState(null);
  const [painelUri, setPainelUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState('');
  const [error, setError] = useState(null);

  // ── Estado do Mapa / Rota ──
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeOrigin, setRouteOrigin] = useState(null);
  const [routeDestination, setRouteDestination] = useState(null);

  const { clearJourney } = useJourney();

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

        // ── Calcular rota concluída para exibição no mapa ──
        if (currentJourney?.origem && currentJourney?.destino) {
          try {
            setRouteLoading(true);
            const originCoord = await resolveJourneyRoutePoint(currentJourney, 'origin');
            const destCoord = await resolveJourneyRoutePoint(currentJourney, 'destination');
            if (!originCoord || !destCoord) {
              setRouteOrigin(null);
              setRouteDestination(null);
              setRouteInfo(null);
            } else {
              const route = await fetchRoute(originCoord, destCoord);
              setRouteOrigin(originCoord);
              setRouteDestination(destCoord);
              setRouteInfo(route);
            }
          } catch (routeError) {
            console.warn('[VehicleCheckout] Erro ao calcular rota:', routeError.message);
          } finally {
            setRouteLoading(false);
          }
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
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissao negada', 'Preciso de acesso a camera para registrar a foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.4,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setter({ uri: asset.uri, base64: asset.base64 });
    }
  };

  const handleFinish = async () => {
    if (!kmFinal.trim()) {
      Alert.alert('Informe o KM final', 'Digite o KM atual do veículo ao finalizar.');
      return;
    }
    if (!combustivel.trim()) {
      Alert.alert('Informe o nivel de combustivel', 'Digite o nivel de combustivel do veiculo ao finalizar.');
      return;
    }
    if (!journey) {
      return;
    }

    setSaving(true);
    setSavingStatus('Iniciando...');
    setError(null);

    let isFinished = false;

    // Temporizador de segurança (35 segundos)
    const timeout = setTimeout(() => {
      if (!isFinished) {
        setSaving(false);
        setSavingStatus('');
        Alert.alert(
          '⏰ Tempo excedido',
          'A finalização está demorando mais que o esperado. Verifique sua conexão e tente novamente.'
        );
      }
    }, 35000);

    try {
      const userResponse = await supabase.auth.getUser();
      const usuarioId = userResponse.data?.user?.id;
      if (!usuarioId) {
        throw new Error('Usuário não autenticado.');
      }

      // 2. Validação e sanitização de Tipos (KM Final)
      const sanitizedKm = kmFinal.replace(',', '.');

      await finishJourney({
        jornadaId: journey.id,
        usuarioId,
        veiculoId: journey.veiculo_id,
        kmFinal: sanitizedKm,
        nivelCombustivel: combustivel,
        observacoes: observations,
        selfieUrl: selfieUri,
        fotosVeiculoUrl: [frenteUri, lateralEsqUri, lateralDirUri, traseiraUri],
        painelUrl: painelUri,
        onProgress: (status) => setSavingStatus(status),
      });

      isFinished = true;
      clearTimeout(timeout);
      await clearJourney();

      Alert.alert('✅ Jornada finalizada', 'O encerramento da jornada foi registrado com sucesso.', [
        { text: 'OK', onPress: () => navigation.navigate('Dashboard') },
      ]);
    } catch (saveError) {
      isFinished = true;
      clearTimeout(timeout);
      console.error('[VehicleCheckoutScreen] Erro ao finalizar jornada:', JSON.stringify(saveError, null, 2));
      console.error('[VehicleCheckoutScreen] Mensagem do erro:', saveError.message);
      
      const errorMessage = saveError?.message || saveError?.details || 'Erro desconhecido ao encerrar a jornada.';
      setError(`Falha: ${errorMessage}`);
      Alert.alert('❌ Erro ao finalizar jornada', errorMessage);
    } finally {
      setSaving(false);
      setSavingStatus('');
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

        {/* ── Mapa de Rota Concluída (Minimizado, Read-only) ── */}
        {journey?.origem && journey?.destino && (
          <RouteMap
            origin={routeOrigin || getJourneyRoutePoint(journey, 'origin')}
            destination={routeDestination || getJourneyRoutePoint(journey, 'destination')}
            routeInfo={routeInfo}
            loading={routeLoading}
            initialMode="minimized"
            isInteractive={false}
            showUserLocation={false}
          />
        )}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>KM Final</Text>
          <View style={styles.inputRow}>
            <Ionicons name="speedometer-outline" size={20} color={COLORS.gray400} />
            <TextInput
              value={kmFinal}
              onChangeText={setKmFinal}
              placeholder="Ex: 50420"
              placeholderTextColor={COLORS.gray600}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Nivel de Combustivel</Text>
          <View style={styles.inputRow}>
            <Ionicons name="water-outline" size={20} color={COLORS.gray400} />
            <TextInput
              value={combustivel}
              onChangeText={setCombustivel}
              placeholder="Ex: Meio tanque, reserva"
              placeholderTextColor={COLORS.gray600}
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Foto do Painel</Text>
          <TouchableOpacity style={styles.photoButton} onPress={() => pickImage(setPainelUri)} activeOpacity={0.85}>
            <Ionicons name="camera-outline" size={18} color={COLORS.white} />
            <Text style={styles.photoButtonText}>{painelUri ? 'Refazer Foto do Painel' : 'Tirar Foto do Painel'}</Text>
          </TouchableOpacity>

          {painelUri ? (
            <View style={styles.panelPreviewWrapper}>
              <Image source={{ uri: painelUri.uri }} style={styles.panelPreview} resizeMode="cover" />
              <TouchableOpacity style={styles.panelRemoveButton} onPress={() => setPainelUri(null)} activeOpacity={0.8}>
                <Ionicons name="close-circle" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Observações</Text>
          <TextInput
            value={observations}
            onChangeText={setObservations}
            placeholder="Descreva avarias, ocorrências ou detalhes adicionais"
            placeholderTextColor={COLORS.gray600}
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <Text style={styles.sectionTitle}>Fotos de Conferência</Text>
        <View style={styles.photoPickerGrid}>
          <TouchableOpacity style={styles.photoCardHalf} onPress={() => pickImage(setSelfieUri)} activeOpacity={0.85}>
            {selfieUri ? <Image source={{ uri: selfieUri.uri }} style={styles.photoPreview} /> : <Ionicons name="camera-outline" size={28} color={COLORS.gray500} />}
            <Text style={styles.photoLabel}>Selfie</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoCardHalf} onPress={() => pickImage(setFrenteUri)} activeOpacity={0.85}>
            {frenteUri ? <Image source={{ uri: frenteUri.uri }} style={styles.photoPreview} /> : <Ionicons name="car-outline" size={28} color={COLORS.gray500} />}
            <Text style={styles.photoLabel}>Frente</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoCardHalf} onPress={() => pickImage(setLateralEsqUri)} activeOpacity={0.85}>
            {lateralEsqUri ? <Image source={{ uri: lateralEsqUri.uri }} style={styles.photoPreview} /> : <Ionicons name="car-outline" size={28} color={COLORS.gray500} />}
            <Text style={styles.photoLabel}>Lateral Esq.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoCardHalf} onPress={() => pickImage(setLateralDirUri)} activeOpacity={0.85}>
            {lateralDirUri ? <Image source={{ uri: lateralDirUri.uri }} style={styles.photoPreview} /> : <Ionicons name="car-outline" size={28} color={COLORS.gray500} />}
            <Text style={styles.photoLabel}>Lateral Dir.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoCardHalf} onPress={() => pickImage(setTraseiraUri)} activeOpacity={0.85}>
            {traseiraUri ? <Image source={{ uri: traseiraUri.uri }} style={styles.photoPreview} /> : <Ionicons name="car-outline" size={28} color={COLORS.gray500} />}
            <Text style={styles.photoLabel}>Traseira</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.finishBtn, (!kmFinal.trim() || !combustivel.trim() || saving) && styles.btnDisabled]}
          onPress={handleFinish}
          activeOpacity={0.85}
          disabled={!kmFinal.trim() || !combustivel.trim() || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
          )}
          <Text style={styles.finishBtnText}>
            {saving ? (savingStatus || 'Finalizando...') : 'Finalizar Jornada'}
          </Text>
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
  photoPickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
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
  photoCardHalf: {
    width: '48%',
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
  photoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.primary },
  photoButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  panelPreviewWrapper: { position: 'relative', marginTop: SPACING.sm, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  panelPreview: { width: '100%', height: 180, backgroundColor: COLORS.gray200 },
  panelRemoveButton: { position: 'absolute', top: SPACING.sm, right: SPACING.sm, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 999, padding: 2 },
  photoPreview: { width: '100%', height: 120, borderRadius: BORDER_RADIUS.md },
  footer: { padding: SPACING.md, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  finishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md },
  finishBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  errorText: { color: COLORS.danger, textAlign: 'center' },
});
