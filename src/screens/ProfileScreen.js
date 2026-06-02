import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { supabase } from '../services/supabase';
import { fetchUserProfile } from '../services/dbService';

export default function ProfileScreen() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const userResponse = await supabase.auth.getUser();
                console.log('[DEBUG LOGITRACK] ProfileScreen getUser response:', userResponse);
                const userId = userResponse.data?.user?.id;
                if (!userId) {
                    setError('N�o foi poss�vel identificar o usu�rio.');
                    return;
                }
                const userProfile = await fetchUserProfile(userId);
                console.log('[DEBUG LOGITRACK] ProfileScreen fetchUserProfile result:', userProfile);
                setProfile(userProfile);
            } catch (loadError) {
                setError('Falha ao carregar perfil.');
                console.warn(loadError);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (signOutError) {
            Alert.alert('Erro', 'N�o foi poss�vel sair no momento. Tente novamente.');
            console.warn(signOutError);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>{error}</Text>
            </SafeAreaView>
        );
    }

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
                <Text style={styles.cardTitle}>{profile?.nome || 'Usu�rio'}</Text>
                <Text style={styles.cardSubtitle}>{profile?.role || 'Perfil'}</Text>
                <View style={styles.infoRow}>
                    <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.infoText}>{profile?.email || 'Sem e-mail'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.infoText}>{profile?.telefone || 'Sem telefone'}</Text>
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
                        <Text style={styles.metricLabel}>Viagens/M�s</Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut} activeOpacity={0.85}>
                <Ionicons name="log-out-outline" size={18} color={COLORS.white} />
                <Text style={styles.logoutText}>Sair</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.gray100, padding: SPACING.md },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.gray100 },
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
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.danger,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginTop: SPACING.sm,
    },
    logoutText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
    errorText: { color: COLORS.danger, textAlign: 'center', marginTop: SPACING.md },
});
