import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { supabase } from '../services/supabase';
import { fetchActiveJourney, fetchVeiculoById } from '../services/dbService';

export default function JourneyInProgressScreen({ navigation }) {
  const [journey, setJourney] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState('00:00:00');

  useEffect(() => {
    let interval;

    const loadJourney = async () => {
      try {
        const userResponse = await supabase.auth.getUser();
        const usuarioId = userResponse.data?.user?.id;
        if (!usuarioId) return;

        const currentJourney = await fetchActiveJourney(usuarioId);
        if (!currentJourney) {
          setJourney(null);
          return;
        }

        setJourney(currentJourney);
        const currentVehicle = await fetchVeiculoById(currentJourney.veiculo_id);
        setVehicle(currentVehicle);

        const updateDuration = () => {
          if (!currentJourney.inicio) return;
          const start = new Date(currentJourney.inicio);
          const seconds = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
          const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
          const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
          const s = String(seconds % 60).padStart(2, '0');
          setDuration(`${h}:${m}:${s}`);
        };

        updateDuration();
        interval = setInterval(updateDuration, 1000);
      } catch (error) {
        console.warn('Erro ao carregar jornada ativa', error);
      } finally {
        setLoading(false);
      }
    };

    loadJourney();
    return () => clearInterval(interval);
  }, []);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionTitle}>Jornada em Andamento</Text>
          <Text style={styles.sectionSubtitle}>{vehicle?.modelo ?? 'Veículo em rota'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close-circle-outline" size={28} color={COLORS.gray700} />
        </TouchableOpacity>
      </View>

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
            <Text style={styles.statValue}>{vehicle?.eta ?? '---'}</Text>
            <Text style={styles.statLabel}>ETA</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>Finalizar Jornada</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Dashboard')} activeOpacity={0.85}>
        <Text style={styles.secondaryBtnText}>Voltar ao Painel</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray100, padding: SPACING.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.gray100 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
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
    marginBottom: SPACING.md,
  },
  infoLabel: { fontSize: 12, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: SPACING.sm },
  infoText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  statCard: { flex: 1, backgroundColor: COLORS.gray100, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: SPACING.xs },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center', marginBottom: SPACING.sm },
  primaryBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  secondaryBtn: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  secondaryBtnText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 16 },
});
