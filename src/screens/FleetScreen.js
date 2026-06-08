import React, { useState, useCallback } from 'react';
import { View, Text, SafeAreaView, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { useFocusEffect } from '@react-navigation/native';
import { fetchVeiculos } from '../services/dbService';
import { AdminOnly } from '../components/AdminGuard';

export default function FleetScreen({ navigation }) {
    const [veiculos, setVeiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const loadVehicles = async () => {
                try {
                    setLoading(true);
                    const data = await fetchVeiculos();
                    if (isActive) {
                        setVeiculos(data || []);
                    }
                } catch (loadError) {
                    if (isActive) {
                        setError('Erro ao carregar veículos.');
                    }
                    console.warn(loadError);
                } finally {
                    if (isActive) {
                        setLoading(false);
                    }
                }
            };

            loadVehicles();

            return () => {
                isActive = false;
            };
        }, [])
    );

    const countByStatus = (status) => veiculos.filter((vehicle) => vehicle.status === status).length;

    const getBadgeStyle = (status) => {
        if (status === 'Disponivel') return styles.statusAvailable;
        if (status === 'Manutencao') return styles.statusWarning;
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
                    <Text style={styles.subtitle}>Visao geral dos veiculos da empresa</Text>
                </View>

                <AdminOnly>
                    <TouchableOpacity
                        style={styles.adminAddButton}
                        onPress={() => navigation.navigate('CreateVehicle')}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="add-circle" size={20} color={COLORS.white} />
                        <Text style={styles.adminAddButtonText}>Cadastrar Veiculo</Text>
                        <View style={styles.adminTag}>
                            <Ionicons name="shield-checkmark" size={12} color={COLORS.white} />
                        </View>
                    </TouchableOpacity>
                </AdminOnly>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{veiculos.length}</Text>
                        <Text style={styles.statLabel}>Veiculos</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{countByStatus('Disponivel')}</Text>
                        <Text style={styles.statLabel}>Ativos</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{countByStatus('Manutencao')}</Text>
                        <Text style={styles.statLabel}>Manutencao</Text>
                    </View>
                </View>

                {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : !veiculos.length ? (
                    <Text style={styles.emptyText}>Nenhum veiculo cadastrado no momento.</Text>
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
                                    <Text style={styles.infoText}>{vehicle.localizacao || 'Nao informado'}</Text>
                                </View>
                                <View style={styles.infoBlock}>
                                    <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                                    <Text style={styles.infoText}>ETA {vehicle.eta || '-'}</Text>
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
    adminAddButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md,
        marginHorizontal: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
    adminAddButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
    adminTag: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
        padding: 2,
    },
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
