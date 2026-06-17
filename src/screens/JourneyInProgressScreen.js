import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { fetchActiveJourney, fetchVeiculoById } from '../services/dbService';
import RouteMap from '../components/RouteMap';
import useLocation from '../hooks/useLocation';
import { fetchRoute, resolveLocation, calculateETA } from '../services/osrmService';

export default function JourneyInProgressScreen({ navigation }) {
  const [journey, setJourney] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState('00:00:00');

  // ── Estado do Mapa / Rota ──
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [eta, setEta] = useState('---');

  // ── GPS em Tempo Real ──
  const { location, errorMsg, isTracking } = useLocation({
    enabled: true,
    distanceInterval: 15,   // Atualiza a cada 15 metros
    timeInterval: 5000,     // Ou a cada 5 segundos
    accuracy: 'High',
  });

  useFocusEffect(
    useCallback(() => {
      let interval;
      let isActive = true;

      const loadJourney = async () => {
        try {
          setLoading(true);
          const userResponse = await supabase.auth.getUser();
          const usuarioId = userResponse.data?.user?.id;
          if (!usuarioId) return;

          const currentJourney = await fetchActiveJourney(usuarioId);
          if (!currentJourney) {
            if (isActive) {
              setJourney(null);
              setLoading(false);
            }
            return;
          }

          if (isActive) {
            setJourney(currentJourney);
          }
          const currentVehicle = await fetchVeiculoById(currentJourney.veiculo_id);
          if (isActive) {
            setVehicle(currentVehicle);
          }

          // ── Calcular rota via OSRM ──
          if (currentJourney.origem && currentJourney.destino) {
            try {
              setRouteLoading(true);
              const originCoord = resolveLocation(currentJourney.origem, 'origin');
              const destCoord = resolveLocation(currentJourney.destino, 'destination');
              const route = await fetchRoute(originCoord, destCoord);
              if (isActive) {
                setRouteInfo(route);
                setEta(calculateETA(route.durationMin));
              }
            } catch (routeError) {
              console.warn('[JourneyInProgress] Erro ao calcular rota:', routeError.message);
            } finally {
              if (isActive) setRouteLoading(false);
            }
          }

          const updateDuration = () => {
            if (!currentJourney.iniciado_em) return;
            const start = new Date(currentJourney.iniciado_em);
            const seconds = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
            const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
            const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
            const s = String(seconds % 60).padStart(2, '0');
            if (isActive) setDuration(`${h}:${m}:${s}`);
          };

          updateDuration();
          interval = setInterval(updateDuration, 1000);
        } catch (error) {
          console.warn('Erro ao carregar jornada ativa', error);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      loadJourney();

      return () => {
        isActive = false;
        clearInterval(interval);
      };
    }, [])
  );

  const handleFinish = () => {
    navigation.navigate('VehicleCheckout');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!journey) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Nenhuma jornada em andamento</Text>
          <Text style={styles.emptySubtitle}>Inicie um check-in para começar uma nova jornada.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('VehicleCheckin')} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Iniciar Jornada</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Resolver coordenadas para o mapa
  const originCoord = journey.origem
    ? resolveLocation(journey.origem, 'origin')
    : null;
  const destCoord = journey.destino
    ? resolveLocation(journey.destino, 'destination')
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.sectionTitle}>Jornada em Andamento</Text>
            <Text style={styles.sectionSubtitle}>{vehicle?.modelo ?? 'Veículo em rota'}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close-circle-outline" size={28} color={COLORS.gray700} />
          </TouchableOpacity>
        </View>

        {/* ── Mapa Expandido com GPS ── */}
        <RouteMap
          origin={originCoord ? { ...originCoord, label: journey.origem } : null}
          destination={destCoord ? { ...destCoord, label: journey.destino } : null}
          routeInfo={routeInfo}
          showUserLocation={true}
          isInteractive={true}
          initialMode="expanded"
          loading={routeLoading}
        />

        {/* Card de Informações */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Veículo</Text>
          <Text style={styles.infoText}>{vehicle?.placa ?? '---'} · {vehicle?.modelo ?? '---'}</Text>

          <Text style={styles.infoLabel}>Origem</Text>
          <Text style={styles.infoText}>{journey.origem || 'Não informado'}</Text>

          <Text style={styles.infoLabel}>Destino</Text>
          <Text style={styles.infoText}>{journey.destino || 'Não informado'}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{duration}</Text>
              <Text style={styles.statLabel}>Tempo de Rota</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{eta}</Text>
              <Text style={styles.statLabel}>ETA</Text>
            </View>
          </View>

          {/* Indicador de GPS */}
          <View style={styles.gpsIndicator}>
            <View style={[styles.gpsDot, isTracking ? styles.gpsDotActive : styles.gpsDotInactive]} />
            <Text style={styles.gpsText}>
              {isTracking
                ? 'GPS ativo'
                : errorMsg || 'GPS inativo'}
            </Text>
          </View>
        </View>

        {/* Botões */}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Finalizar Jornada</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Dashboard')} activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>Voltar ao Painel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.gray100 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.lg },
  scrollContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  sectionSubtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: SPACING.xs },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  infoLabel: { fontSize: 12, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: SPACING.sm },
  infoText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  statCard: { flex: 1, backgroundColor: COLORS.gray100, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: SPACING.xs },

  // ── GPS Indicator ──
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsDotActive: {
    backgroundColor: COLORS.success,
  },
  gpsDotInactive: {
    backgroundColor: COLORS.gray400,
  },
  gpsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center' },
  primaryBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  secondaryBtn: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  secondaryBtnText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 16 },
});
