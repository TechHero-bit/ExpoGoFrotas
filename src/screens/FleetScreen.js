import React from 'react';
import { View, Text, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';

const VEHICLES = [
    { plate: 'ABC-1234', model: 'Toyota Corolla', status: 'Em rota', location: 'Norte', eta: '14:30' },
    { plate: 'XYZ-9876', model: 'Hyundai HB20', status: 'Disponível', location: 'Matriz', eta: '—' },
    { plate: 'KLM-4567', model: 'Renault Duster', status: 'Manutenção', location: 'Oficina', eta: 'Amanhã' },
];

export default function FleetScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Frota</Text>
                    <Text style={styles.subtitle}>Visão geral dos veículos da empresa</Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>12</Text>
                        <Text style={styles.statLabel}>Veículos</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>08</Text>
                        <Text style={styles.statLabel}>Ativos</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>02</Text>
                        <Text style={styles.statLabel}>Manutenção</Text>
                    </View>
                </View>

                {VEHICLES.map((vehicle) => (
                    <View key={vehicle.plate} style={styles.vehicleCard}>
                        <View style={styles.vehicleHeader}>
                            <View>
                                <Text style={styles.vehicleModel}>{vehicle.model}</Text>
                                <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>
                            </View>
                            <View style={[styles.statusBadge, vehicle.status === 'Disponível' ? styles.statusAvailable : vehicle.status === 'Manutenção' ? styles.statusWarning : styles.statusActive]}>
                                <Text style={styles.statusText}>{vehicle.status}</Text>
                            </View>
                        </View>
                        <View style={styles.vehicleInfoRow}>
                            <View style={styles.infoBlock}>
                                <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                                <Text style={styles.infoText}>{vehicle.location}</Text>
                            </View>
                            <View style={styles.infoBlock}>
                                <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                                <Text style={styles.infoText}>ETA {vehicle.eta}</Text>
                            </View>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.gray100 },
    content: { padding: SPACING.md, gap: SPACING.md },
    header: { gap: SPACING.xs },
    title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
    subtitle: { fontSize: 14, color: COLORS.textSecondary },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
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
});