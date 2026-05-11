import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';

const SUMMARY_CARDS = [
    { label: 'Disponíveis', value: '08', icon: 'checkmark-circle-outline' },
    { label: 'Em rota', value: '03', icon: 'car-outline' },
    { label: 'Manutenção', value: '01', icon: 'construct-outline' },
];

export default function DashboardScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.avatar}>
                        <Ionicons name="person" size={20} color={COLORS.white} />
                    </View>
                    <View>
                        <Text style={styles.appName}>Logistics Pro</Text>
                        <Text style={styles.userName}>Ricardo Souza</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.bellBtn}>
                    <Ionicons name="notifications-outline" size={24} color={COLORS.gray700} />
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
                {/* Start Journey Button */}
                <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => navigation.navigate('VehicleCheckin')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.startButtonText}>INICIAR{'\n'}JORNADA</Text>
                </TouchableOpacity>

                <Text style={styles.subtext}>(Retirar Veículo)</Text>
            </View>

            <View style={styles.heroCard}>
                <View>
                    <Text style={styles.heroTitle}>Controle da sua frota</Text>
                    <Text style={styles.heroSubtitle}>Acompanhe viagens, check-ins e a disponibilidade dos veículos em tempo real.</Text>
                </View>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1517530095992-4b4cc5a6ccc1?auto=format&fit=crop&w=900&q=80' }} style={styles.heroImage} />
            </View>

            <View style={styles.summaryRow}>
                {SUMMARY_CARDS.map((item) => (
                    <View key={item.label} style={styles.summaryCard}>
                        <Ionicons name={item.icon} size={22} color={COLORS.primary} />
                        <Text style={styles.summaryValue}>{item.value}</Text>
                        <Text style={styles.summaryLabel}>{item.label}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.actionsContainer}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('VehicleCheckin')}
                    activeOpacity={0.85}
                >
                    <Ionicons name="car-sport-outline" size={20} color={COLORS.white} />
                    <Text style={styles.actionButtonText}>Iniciar Check-in</Text>
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
    heroTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs },
    heroSubtitle: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, flex: 1 },
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