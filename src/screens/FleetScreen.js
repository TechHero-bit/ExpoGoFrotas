import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { fetchVeiculos } from '../services/dbService';

export default function FleetScreen() {
    const [veiculos, setVeiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadVehicles = async () => {
            try {
                const data = await fetchVeiculos();
                setVeiculos(data || []);
            } catch (loadError) {
                setError('Não foi possível carregar os veículos. Tente novamente.');
                console.warn(loadError);
            } finally {
                setLoading(false);
            }
        };

        loadVehicles();
    }, []);

    const countByStatus = (status) => veiculos.filter((vehicle) => vehicle.status === status).length;

    const getBadgeStyle = (status) => {
        if (status === 'Disponível') return styles.statusAvailable;
        if (status === 'Manutenção') return styles.statusWarning;
        return styles.statusActive;
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
                    <Text style={styles.title}>Frota</Text>
                    <Text style={styles.subtitle}>Visão geral dos veículos da empresa</Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{veiculos.length}</Text>
                        <Text style={styles.statLabel}>Veículos</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{countByStatus('Disponível')}</Text>
                        <Text style={styles.statLabel}>Ativos</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{countByStatus('Manutenção')}</Text>
                        <Text style={styles.statLabel}>Manutenção</Text>
                    </View>
                </View>

                {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : !veiculos.length ? (
                    <Text style={styles.emptyText}>Nenhum veículo cadastrado no momento.</Text>
                ) : (
                    veiculos.map((vehicle) => (
                        <View key={vehicle.id} style={styles.vehicleCard}>
                            <View style={styles.vehicleHeader}>
                                <View>
                                    <Text style={styles.vehicleModel}>{vehicle.modelo}</Text>
                                    <Text style={styles.vehiclePlate}>{vehicle.placa}</Text>
                                </View>
                                <View style={[styles.statusBadge, getBadgeStyle(vehicle.status)]}>
                                    <Text style={styles.statusText}>{vehicle.status}</Text>
                                </View>
                            </View>
                            <View style={styles.vehicleInfoRow}>
                                <View style={styles.infoBlock}>
                                    <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                                    <Text style={styles.infoText}>{vehicle.localizacao || 'Não informado'}</Text>
                                </View>
                                <View style={styles.infoBlock}>
                                    <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                                    <Text style={styles.infoText}>ETA {vehicle.eta || '—'}</Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.gray100 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.gray100 },
    content: { padding: SPACING.md, gap: SPACING.md },
    header: { gap: SPACING.xs, paddingTop: SPACING.md, paddingHorizontal: SPACING.md },
    title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
    subtitle: { fontSize: 14, color: COLORS.textSecondary },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm, paddingHorizontal: SPACING.md },
    statCard: {
        flex: 1,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    statValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
    statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: SPACING.xs },
    vehicleCard: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: SPACING.md,
        marginHorizontal: SPACING.md,
    },
    vehicleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    vehicleModel: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    vehiclePlate: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.xs },
    statusBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.lg,
    },
    statusAvailable: { backgroundColor: '#E6F5EA' },
    statusActive: { backgroundColor: '#FFECEC' },
    statusWarning: { backgroundColor: '#FFF4E6' },
    statusText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
    vehicleInfoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
    infoBlock: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    infoText: { fontSize: 13, color: COLORS.textSecondary },
    errorText: { color: COLORS.danger, paddingHorizontal: SPACING.md },
    emptyText: { paddingHorizontal: SPACING.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.md },
});
