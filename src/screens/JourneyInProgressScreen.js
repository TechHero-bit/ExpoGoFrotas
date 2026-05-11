import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';

export default function JourneyInProgressScreen({ navigation }) {
    const [seconds, setSeconds] = useState(9912); // 02:45:12

    useEffect(() => {
        const interval = setInterval(() => {
            setSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const handleArrivedAtClient = () => {
        Alert.alert(
            'Chegou no Cliente',
            'Confirmar chegada ao destino?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Confirmar', onPress: () => navigation.navigate('VehicleCheckout') },
            ]
        );
    };

    const handleReturnToBase = () => {
        Alert.alert(
            'Retornar à Base',
            'Deseja encerrar a rota e retornar à base?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Confirmar', onPress: () => navigation.navigate('VehicleCheckout') },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.avatar}>
                        <Ionicons name="person" size={18} color={COLORS.white} />
                    </View>
                    <Text style={styles.appName}>Logistics Pro</Text>
                </View>
                <TouchableOpacity>
                    <Ionicons name="notifications-outline" size={24} color={COLORS.gray700} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Status Title */}
                <Text style={styles.statusTitle}>Status Atual</Text>

                {/* Timer */}
                <Text style={styles.timer}>{formatTime(seconds)}</Text>
                <View style={styles.timerLabel}>
                    <Text style={styles.timerLabelText}>TEMPO DE ROTA</Text>
                </View>

                {/* Destination Card */}
                <View style={styles.destinationCard}>
                    <View style={styles.destinationHeader}>
                        <Ionicons name="location" size={16} color={COLORS.primary} />
                        <Text style={styles.destinationHeaderText}>DESTINO EM ROTA</Text>
                    </View>

                    <Text style={styles.destinationName}>Centro de Distribuição Norte</Text>
                    <Text style={styles.destinationAddress}>
                        Av. das Indústrias, 4500 - Galpão 3{'\n'}
                        Zona Industrial, Setor B
                    </Text>

                    <View style={styles.etaRow}>
                        <Text style={styles.etaLabel}>Previsão de Chegada</Text>
                        <Text style={styles.etaValue}>14:30</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleArrivedAtClient}
                    activeOpacity={0.85}
                >
                    <Text style={styles.primaryBtnText}>Cheguei no Cliente</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={handleReturnToBase}
                    activeOpacity={0.8}
                >
                    <Text style={styles.secondaryBtnText}>Retornar à Base</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    appName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    scrollContent: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.xl,
        alignItems: 'center',
    },
    statusTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.md,
    },
    timer: {
        fontSize: 52,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: 2,
        fontVariant: ['tabular-nums'],
    },
    timerLabel: {
        marginBottom: SPACING.xl,
        marginTop: SPACING.xs,
    },
    timerLabelText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.gray500,
        letterSpacing: 2,
    },
    destinationCard: {
        width: '100%',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
        backgroundColor: COLORS.white,
    },
    destinationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginBottom: SPACING.sm,
    },
    destinationHeaderText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.primary,
        letterSpacing: 1,
    },
    destinationName: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    destinationAddress: {
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 20,
        marginBottom: SPACING.md,
    },
    etaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.sm,
    },
    etaLabel: { fontSize: 13, color: COLORS.textSecondary },
    etaValue: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
    primaryBtn: {
        width: '100%',
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        marginBottom: SPACING.sm,
        elevation: 3,
    },
    primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
    secondaryBtn: {
        width: '100%',
        borderWidth: 2,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
    },
    secondaryBtnText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
});