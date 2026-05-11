import React from 'react';
import { View, Text, SafeAreaView, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';

export default function ProfileScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Meu Perfil</Text>
                    <Text style={styles.subtitle}>Dados do gestor e do motorista</Text>
                </View>
                <View style={styles.avatarContainer}>
                    <Image source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80' }} style={styles.avatar} />
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Ricardo Souza</Text>
                <Text style={styles.cardSubtitle}>Gerente de Frota</Text>
                <View style={styles.infoRow}>
                    <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.infoText}>ricardo.souza@empresa.com</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.infoText}>+55 11 98765-4321</Text>
                </View>
            </View>

            <View style={styles.card}> 
                <Text style={styles.cardTitle}>Performance da Frota</Text>
                <View style={styles.metricRow}>
                    <View style={styles.metricBlock}>
                        <Text style={styles.metricValue}>96%</Text>
                        <Text style={styles.metricLabel}>Disponibilidade</Text>
                    </View>
                    <View style={styles.metricBlock}>
                        <Text style={styles.metricValue}>18</Text>
                        <Text style={styles.metricLabel}>Viagens/Mês</Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.gray100, padding: SPACING.md },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
    subtitle: { fontSize: 14, color: COLORS.textSecondary },
    avatarContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    avatar: { width: '100%', height: '100%' },
    card: {
        backgroundColor: COLORS.white,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.md,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
    cardSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
    infoText: { fontSize: 13, color: COLORS.textSecondary },
    metricRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md },
    metricBlock: { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.gray100, alignItems: 'center' },
    metricValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
    metricLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },
});