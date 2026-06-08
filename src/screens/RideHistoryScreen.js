import React, { useState, useCallback } from 'react';
import { View, Text, SafeAreaView, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import AdminGuard from '../components/AdminGuard';
import { fetchAllJourneys } from '../services/dbService';

export default function RideHistoryScreen({ navigation }) {
    const [journeys, setJourneys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const loadHistory = async () => {
                try {
                    setLoading(true);
                    const data = await fetchAllJourneys();
                    if (isActive) {
                        setJourneys(data || []);
                    }
                } catch (loadError) {
                    if (isActive) {
                        setError('Erro ao carregar o historico de corridas.');
                    }
                    console.warn(loadError);
                } finally {
                    if (isActive) {
                        setLoading(false);
                    }
                }
            };

            loadHistory();

            return () => {
                isActive = false;
            };
        }, [])
    );

    const formatDate = (dateString) => {
        if (!dateString) return '--/--/---- --:--';
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR');
    };

    const renderJourneyItem = ({ item }) => {
        const motoristaNome = item.usuarios?.nome || 'Desconhecido';
        const placa = item.veiculos?.placa || 'Sem placa';
        const modelo = item.veiculos?.modelo || 'Veiculo desconhecido';

        return (
            <TouchableOpacity 
                style={styles.card} 
                activeOpacity={0.8}
                onPress={() => navigation.navigate('RideDetails', { journey: item })}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.motoristaName}>{motoristaNome}</Text>
                    <View style={[styles.statusBadge, item.status === 'Finalizada' ? styles.statusFinished : styles.statusActive]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <Ionicons name="car-outline" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.infoText}>{modelo} - {placa}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.infoText}>{formatDate(item.iniciado_em)}</Text>
                    </View>
                </View>
                
                <View style={styles.cardFooter}>
                    <Text style={styles.footerText}>De: {item.origem}</Text>
                    <Text style={styles.footerText}>Para: {item.destino}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <AdminGuard navigation={navigation}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.title}>Historico</Text>
                        <Text style={styles.subtitle}>Todas as corridas registradas</Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : error ? (
                    <View style={styles.centerContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={journeys}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderJourneyItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>Nenhuma corrida encontrada.</Text>
                        }
                    />
                )}
            </SafeAreaView>
        </AdminGuard>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.gray100 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: SPACING.md, 
        paddingTop: SPACING.md,
        paddingBottom: SPACING.sm,
        gap: SPACING.md
    },
    backButton: {
        padding: SPACING.xs,
    },
    title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
    subtitle: { fontSize: 13, color: COLORS.textSecondary },
    listContent: { padding: SPACING.md, paddingBottom: SPACING.xxl },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    motoristaName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    statusBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.lg,
    },
    statusFinished: { backgroundColor: '#E6F5EA' },
    statusActive: { backgroundColor: '#FFF4E6' },
    statusText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
    cardBody: {
        marginBottom: SPACING.sm,
        gap: 6,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    infoText: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    cardFooter: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.sm,
        gap: 4,
    },
    footerText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    errorText: { color: COLORS.danger, textAlign: 'center' },
    emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: SPACING.xl },
});
