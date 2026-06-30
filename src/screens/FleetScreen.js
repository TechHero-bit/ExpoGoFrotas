import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { useFocusEffect } from '@react-navigation/native';
import { fetchVeiculos, fetchAdmins, updateVehicle } from '../services/dbService';
import { AdminOnly } from '../components/AdminGuard';

export default function FleetScreen({ navigation }) {
    const [veiculos, setVeiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Edit State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [editPlaca, setEditPlaca] = useState('');
    const [editModelo, setEditModelo] = useState('');
    const [editResponsavel, setEditResponsavel] = useState('');
    const [admins, setAdmins] = useState([]);
    const [saving, setSaving] = useState(false);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const loadVehicles = async () => {
                try {
                    setLoading(true);
                    const [data, adminsData] = await Promise.all([
                        fetchVeiculos(),
                        fetchAdmins()
                    ]);
                    if (isActive) {
                        setVeiculos(data || []);
                        setAdmins(adminsData || []);
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
        if (status === 'Disponível' || status === 'Disponivel') return styles.statusAvailable;
        if (status === 'Manutenção' || status === 'Manutencao') return styles.statusWarning;
        return styles.statusActive;
    };

    const handleSaveEdit = async () => {
        if (!editPlaca.trim() || !editModelo.trim()) {
            Alert.alert('Erro', 'Placa e Modelo são obrigatórios.');
            return;
        }

        try {
            setSaving(true);
            await updateVehicle(editingVehicle.id, {
                placa: editPlaca.trim().toUpperCase(),
                modelo: editModelo.trim(),
                responsavel_id: editResponsavel || null
            });
            
            Alert.alert('Sucesso', 'Veículo atualizado!');
            setEditModalVisible(false);
            
            // Recarregar veículos
            const data = await fetchVeiculos();
            setVeiculos(data || []);
            
        } catch (err) {
            Alert.alert('Erro', 'Não foi possível atualizar o veículo.');
            console.error(err);
        } finally {
            setSaving(false);
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
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Frota</Text>
                    <Text style={styles.subtitle}>Visao geral dos veiculos da empresa</Text>
                </View>

                <AdminOnly>
                    <View style={styles.adminActionsRow}>
                        <TouchableOpacity
                            style={styles.adminAddButton}
                            onPress={() => navigation.navigate('CreateVehicle')}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="add-circle" size={20} color={COLORS.white} />
                            <Text style={styles.adminAddButtonText}>Cadastrar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.adminAddButton, styles.adminHistoryButton]}
                            onPress={() => navigation.navigate('RideHistory')}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="list" size={20} color={COLORS.white} />
                            <Text style={styles.adminAddButtonText}>Historico</Text>
                        </TouchableOpacity>
                    </View>
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
                                <AdminOnly>
                                    <TouchableOpacity 
                                        style={styles.editButton}
                                        onPress={() => {
                                            setEditingVehicle(vehicle);
                                            setEditPlaca(vehicle.placa);
                                            setEditModelo(vehicle.modelo);
                                            setEditResponsavel(vehicle.responsavel_id || '');
                                            setEditModalVisible(true);
                                        }}
                                    >
                                        <Ionicons name="pencil" size={16} color={COLORS.primary} />
                                        <Text style={styles.editButtonText}>Editar</Text>
                                    </TouchableOpacity>
                                </AdminOnly>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <Modal visible={editModalVisible} animationType="slide" transparent={true} onRequestClose={() => setEditModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Editar Veículo</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Placa *</Text>
                            <TextInput
                                style={styles.input}
                                value={editPlaca}
                                onChangeText={setEditPlaca}
                                autoCapitalize="characters"
                            />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Modelo *</Text>
                            <TextInput
                                style={styles.input}
                                value={editModelo}
                                onChangeText={setEditModelo}
                            />
                        </View>
                        
                        <View style={styles.field}>
                            <Text style={styles.label}>Responsável</Text>
                            <View style={styles.pickerContainer}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <TouchableOpacity 
                                        style={[styles.adminChip, editResponsavel === '' && styles.adminChipSelected]}
                                        onPress={() => setEditResponsavel('')}
                                    >
                                        <Text style={[styles.adminChipText, editResponsavel === '' && styles.adminChipTextSelected]}>Nenhum</Text>
                                    </TouchableOpacity>
                                    {admins.map(admin => (
                                        <TouchableOpacity 
                                            key={admin.id}
                                            style={[styles.adminChip, editResponsavel === admin.id && styles.adminChipSelected]}
                                            onPress={() => setEditResponsavel(admin.id)}
                                        >
                                            <Text style={[styles.adminChipText, editResponsavel === admin.id && styles.adminChipTextSelected]}>{admin.nome}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={[styles.saveButton, saving && { opacity: 0.7 }]} 
                            onPress={handleSaveEdit}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveButtonText}>Salvar Alterações</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    adminActionsRow: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        gap: SPACING.sm,
    },
    adminAddButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
    adminHistoryButton: {
        backgroundColor: '#4A5568', // A distinct color for history
        shadowColor: '#4A5568',
    },
    adminAddButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
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
    editButton: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm, backgroundColor: '#E6F0FF' },
    editButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl, padding: SPACING.xl, gap: SPACING.md },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
    modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    closeBtn: { padding: SPACING.xs },
    field: { gap: SPACING.xs },
    label: { fontSize: 13, fontWeight: '700', color: COLORS.text },
    input: { backgroundColor: COLORS.gray100, borderRadius: BORDER_RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 4, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
    pickerContainer: { flexDirection: 'row', paddingTop: SPACING.xs },
    adminChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.gray100, marginRight: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
    adminChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    adminChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
    adminChipTextSelected: { color: COLORS.white },
    saveButton: { backgroundColor: COLORS.primary, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, alignItems: 'center', marginTop: SPACING.md },
    saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
