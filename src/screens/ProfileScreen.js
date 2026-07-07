import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { fetchUserProfile, fetchUserJourneysCount, uploadImageToSupabase, updateUserProfilePhoto } from '../services/dbService';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
    const [profile, setProfile] = useState(null);
    const [metrics, setMetrics] = useState({ total: 0, month: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const loadProfile = async () => {
                try {
                    setLoading(true);
                    const userResponse = await supabase.auth.getUser();
                    console.log('[DEBUG LOGITRACK] ProfileScreen getUser response:', userResponse);
                    const userId = userResponse.data?.user?.id;
                    if (!userId) {
                        if (isActive) setError('Não foi possível identificar o usuário.');
                        return;
                    }
                    const userProfile = await fetchUserProfile(userId);
                    const userMetrics = await fetchUserJourneysCount(userId);
                    console.log('[DEBUG LOGITRACK] ProfileScreen fetchUserProfile result:', userProfile);
                    if (isActive) {
                        setProfile(userProfile);
                        setMetrics(userMetrics);
                    }
                } catch (loadError) {
                    if (isActive) setError('Falha ao carregar perfil.');
                    console.warn(loadError);
                } finally {
                    if (isActive) setLoading(false);
                }
            };

            loadProfile();

            return () => {
                isActive = false;
            };
        }, [])
    );

    const handleChangeAvatar = async () => {
        if (!profile?.id) {
            Alert.alert('Erro', 'Não foi possível identificar o usuário para atualizar a foto.');
            return;
        }

        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permissão Negada', 'Precisamos de acesso à câmera para alterar a foto.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (result.canceled) {
                return;
            }

            setUploadingPhoto(true);
            const imageAsset = result.assets[0];
            
            try {
                const avatarPath = `avatars/${profile.id}.png`;
                const uploadResult = await uploadImageToSupabase(imageAsset, `avatar_${profile.id}`, 'FotoDePerfil', avatarPath);

                if (uploadResult && uploadResult.publicUrl) {
                    try {
                        const updatedProfile = await updateUserProfilePhoto(profile.id, uploadResult.publicUrl);
                        const nextPhotoUrl = updatedProfile?.[0]?.foto_perfil_uri || uploadResult.publicUrl;
                        setProfile(prev => ({ ...prev, foto_perfil_uri: nextPhotoUrl }));
                        Alert.alert('Sucesso', 'Foto de perfil atualizada!');
                    } catch (updateError) {
                        console.error('[PROFILE] Falha ao atualizar perfil no banco:', updateError);
                        Alert.alert('Aviso', 'Foto enviada, mas falha ao atualizar o perfil. Tente recarregar o app.');
                    }
                }
            } catch (uploadErr) {
                console.error('[PROFILE] Erro ao fazer upload:', uploadErr);
                const errorMessage = uploadErr?.message || uploadErr?.toString() || 'Falha desconhecida';
                
                // Mensagens de erro mais específicas
                if (errorMessage.includes('permission') || errorMessage.includes('policy') || errorMessage.includes('403')) {
                    Alert.alert('Erro de Permissão', 'Você não tem permissão para fazer upload de fotos. Verifique sua autenticação.');
                } else if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('401')) {
                    Alert.alert('Erro de Conexão', 'Problema de conexão. Verifique sua internet e tente novamente.');
                } else if (errorMessage.includes('Nenhuma tarefa')) {
                    Alert.alert('Erro', 'Falha ao fazer upload da foto. Tente novamente.');
                } else {
                    Alert.alert('Erro', `Falha ao atualizar a foto de perfil: ${errorMessage}`);
                }
            }
        } catch (err) {
            console.error('[PROFILE] Erro geral ao atualizar foto:', err);
            Alert.alert('Erro', 'Ocorreu um erro inesperado. Tente novamente.');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const getRoleDetails = () => {
        const r = (profile?.role || '').toLowerCase();
        if (r.includes('adm') || r.includes('gestor') || r.includes('gerente')) {
            return {
                icon: 'shield-checkmark-outline',
                subtitle: 'Administração e gestão da frota.'
            };
        }
        if (r.includes('motorista') || r.includes('driver')) {
            return {
                icon: 'car-outline',
                subtitle: 'Informações do seu perfil de motorista.'
            };
        }
        return {
            icon: 'person-outline',
            subtitle: 'Dados do seu perfil no sistema.'
        };
    };

    const roleDetails = getRoleDetails();

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (signOutError) {
            Alert.alert('Erro', 'Não foi possível sair no momento. Tente novamente.');
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
                    <Text style={styles.subtitle}>{roleDetails.subtitle}</Text>
                </View>
                <TouchableOpacity style={styles.avatarContainer} onPress={handleChangeAvatar} disabled={uploadingPhoto}>
                    {uploadingPhoto ? (
                        <ActivityIndicator size="small" color={COLORS.primary} style={styles.avatarLoading} />
                    ) : (
                        <Image
                            source={{ uri: profile?.foto_perfil_uri || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80' }}
                            style={styles.avatar}
                        />
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>{profile?.nome || 'Usuário'}</Text>
                <View style={styles.roleRow}>
                    <Ionicons name={roleDetails.icon} size={14} color={COLORS.textSecondary} />
                    <Text style={styles.cardSubtitle}>{profile?.role || 'Perfil'}</Text>
                </View>
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
                        <Text style={styles.metricValue}>{metrics.total}</Text>
                        <Text style={styles.metricLabel}>Viagens Totais</Text>
                    </View>
                    <View style={styles.metricBlock}>
                        <Text style={styles.metricValue}>{metrics.month}</Text>
                        <Text style={styles.metricLabel}>Viagens/Mês</Text>
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
    avatarLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.gray100 },
    card: {
        backgroundColor: COLORS.white,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.md,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
    cardSubtitle: { fontSize: 13, color: COLORS.textSecondary },
    roleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.md },
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
