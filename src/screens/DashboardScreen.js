import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { supabase } from '../services/supabase';
import { fetchUserProfile, fetchDashboardMetrics } from '../services/dbService';
import { useJourney } from '../contexts/JourneyContext';

export default function DashboardScreen({ navigation }) {
    const [profile, setProfile] = useState(null);
    const [metrics, setMetrics] = useState({ disponiveis: 0, emRota: 0, manutencao: 0 });
    const [loading, setLoading] = useState(true);

    const { activeJourney, refreshJourney } = useJourney();

    // useFocusEffect: recarrega dados toda vez que a tela ganha foco
    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const loadData = async () => {
                try {
                    setLoading(true);
                    const userResponse = await supabase.auth.getUser();
                    console.log('[DEBUG LOGITRACK] DashboardScreen getUser response:', userResponse);
                    const userId = userResponse.data?.user?.id;
                    if (!userId) {
                        return;
                    }

                    const [userProfile, dashboardMetrics] = await Promise.all([
                        fetchUserProfile(userId),
                        fetchDashboardMetrics(),
                        refreshJourney(),
                    ]);

                    if (isActive) {
                        console.log('[DEBUG LOGITRACK] DashboardScreen loadData results:', { userId, userProfile, dashboardMetrics });
                        setProfile(userProfile);
                        setMetrics(dashboardMetrics);
                    }
                } catch (error) {
                    console.warn('Erro ao carregar dashboard', error);
                } finally {
                    if (isActive) {
                        setLoading(false);
                    }
                }
            };

            loadData();

            return () => {
                isActive = false;
            };
        }, [refreshJourney])
    );

    const handleMainAction = () => {
        if (activeJourney) {
            navigation.navigate('JourneyInProgress');
        } else {
            navigation.navigate('VehicleCheckin');
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
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.avatar}>
                        <Ionicons name="person" size={20} color={COLORS.white} />
                    </View>
                    <View>
                        <Text style={styles.appName}>LogiTrack</Text>
                        <Text style={styles.userName}>{profile?.nome ?? 'Gestor de Frota'}</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.bellBtn}>
                    <Ionicons name="notifications-outline" size={24} color={COLORS.gray700} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <TouchableOpacity
                    style={[styles.startButton, activeJourney && styles.activeJourneyButton]}
                    onPress={handleMainAction}
                    activeOpacity={0.85}
                >
                    <Text style={styles.startButtonText}>
                        {activeJourney ? 'VER JORNADA ATUAL' : 'INICIAR JORNADA'}
                    </Text>
                </TouchableOpacity>
                <Text style={styles.subtext}>
                    {activeJourney
                        ? 'Você tem uma jornada em andamento. Toque para acompanhar.'
                        : 'Registre um novo check-in e libere o veículo para jornada.'}
                </Text>
            </View>

            <View style={styles.heroCard}>
                <View style={styles.heroTextContainer}>
                    <Text style={styles.heroTitle}>Controle da sua frota</Text>
                    <Text style={styles.heroSubtitle}>Acompanhe viagens, check-ins e a disponibilidade dos veículos em tempo real.</Text>
                </View>
                <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1517530095992-4b4cc5a6ccc1?auto=format&fit=crop&w=900&q=80' }}
                    style={styles.heroImage}
                />
            </View>

            <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                    <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.primary} />
                    <Text style={styles.summaryValue}>{metrics.disponiveis}</Text>
                    <Text style={styles.summaryLabel}>Disponíveis</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Ionicons name="car-outline" size={22} color={COLORS.primary} />
                    <Text style={styles.summaryValue}>{metrics.emRota}</Text>
                    <Text style={styles.summaryLabel}>Em rota</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Ionicons name="construct-outline" size={22} color={COLORS.primary} />
                    <Text style={styles.summaryValue}>{metrics.manutencao}</Text>
                    <Text style={styles.summaryLabel}>Manutenção</Text>
                </View>
            </View>

            <View style={styles.actionsContainer}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleMainAction}
                    activeOpacity={0.85}
                >
                    <Ionicons name={activeJourney ? 'navigate-outline' : 'car-sport-outline'} size={20} color={COLORS.white} />
                    <Text style={styles.actionButtonText}>
                        {activeJourney ? 'Acompanhar Jornada' : 'Iniciar Check-in'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={() => navigation.navigate('Fleet')}>
                    <Text style={styles.secondaryButtonText}>Ver Frota</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.gray100, padding: SPACING.md },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.gray100 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    appName: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text,
    },
    userName: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    bellBtn: {
        padding: SPACING.xs,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.lg,
        gap: SPACING.sm,
    },
    startButton: {
        width: '100%',
        paddingVertical: SPACING.xl,
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    activeJourneyButton: {
        backgroundColor: '#1B6B2E',
    },
    startButtonText: {
        color: COLORS.white,
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: 2,
    },
    subtext: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    heroCard: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    heroTextContainer: { flex: 1, paddingRight: SPACING.sm },
    heroTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs },
    heroSubtitle: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
    heroImage: { width: 98, height: 98, borderRadius: BORDER_RADIUS.lg },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm, marginBottom: SPACING.md },
    summaryCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: SPACING.xs,
    },
    summaryValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    summaryLabel: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
    actionsContainer: { gap: SPACING.sm },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.md,
    },
    actionButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
    secondaryButton: {
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
        alignItems: 'center',
    },
    secondaryButtonText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '700' },
});
