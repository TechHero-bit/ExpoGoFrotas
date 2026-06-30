import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    Modal,
    FlatList
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { supabase } from '../services/supabase';
import { fetchUserProfile, fetchDashboardMetrics, fetchNotifications, markNotificationsAsRead } from '../services/dbService';
import { useJourney } from '../contexts/JourneyContext';

function formatRelativeTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `há ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `há ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `há ${diffDays} d`;
}

export default function DashboardScreen({ navigation }) {
    const [profile, setProfile] = useState(null);
    const [metrics, setMetrics] = useState({ disponiveis: 0, emRota: 0, manutencao: 0 });
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);

    const { activeJourney, refreshJourney } = useJourney();

    React.useEffect(() => {
        if (!profile?.id) return;

        const channel = supabase
            .channel('public:notificacoes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notificacoes', filter: `user_id=eq.${profile.id}` },
                (payload) => {
                    setNotifications(prev => [payload.new, ...prev]);
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id]);

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

                    let notifs = [];
                    let unread = 0;
                    try {
                        notifs = await fetchNotifications(userId);
                        unread = notifs.filter(n => !n.lida).length;
                    } catch (e) {
                        console.warn('Erro ao carregar notificacoes', e);
                    }

                    if (isActive) {
                        console.log('[DEBUG LOGITRACK] DashboardScreen loadData results:', { userId, userProfile, dashboardMetrics });
                        setProfile(userProfile);
                        setMetrics(dashboardMetrics);
                        setNotifications(notifs);
                        setUnreadCount(unread);
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

    const handleOpenNotifications = async () => {
        setModalVisible(true);
        if (unreadCount > 0 && profile?.id) {
            try {
                await markNotificationsAsRead(profile.id);
                setUnreadCount(0);
                setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
            } catch (err) {
                console.error('Erro ao marcar notificações como lidas', err);
            }
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
                <TouchableOpacity style={styles.bellBtn} onPress={handleOpenNotifications}>
                    <Ionicons name="notifications-outline" size={24} color={COLORS.gray700} />
                    {unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                        </View>
                    )}
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

            {/* Modal de Notificações */}
            <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Notificações</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>
                        {notifications.length === 0 ? (
                            <Text style={styles.emptyNotifText}>Nenhuma notificação no momento.</Text>
                        ) : (
                            <FlatList
                                data={notifications}
                                keyExtractor={item => item.id}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.notifList}
                                renderItem={({ item }) => (
                                    <View style={[styles.notifRow, !item.lida && styles.notifUnread]}>
                                        <View style={styles.notifIconContainer}>
                                            <Ionicons name="car-sport" size={20} color={COLORS.primary} />
                                        </View>
                                        <View style={styles.notifTextContainer}>
                                            <Text style={styles.notifMessage}>{item.mensagem}</Text>
                                            <Text style={styles.notifTime}>{formatRelativeTime(item.created_at)}</Text>
                                        </View>
                                    </View>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
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
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: COLORS.danger || '#FF3B30',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl, maxHeight: '80%', padding: SPACING.md },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
    modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    closeBtn: { padding: SPACING.xs },
    emptyNotifText: { textAlign: 'center', color: COLORS.textSecondary, marginVertical: SPACING.xl },
    notifList: { paddingBottom: SPACING.xl },
    notifRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACING.sm },
    notifUnread: { backgroundColor: COLORS.gray100, borderRadius: BORDER_RADIUS.sm, paddingHorizontal: SPACING.sm },
    notifIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E6F0FF', justifyContent: 'center', alignItems: 'center' },
    notifTextContainer: { flex: 1 },
    notifMessage: { fontSize: 14, color: COLORS.text, fontWeight: '600', lineHeight: 20 },
    notifTime: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
});
