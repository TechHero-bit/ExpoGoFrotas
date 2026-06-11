import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    Modal,
    TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { supabase } from '../services/supabase';
import AdminGuard from '../components/AdminGuard';

const ROLE_OPTIONS = [
  { value: 'driver', label: 'Motorista', icon: 'car-outline', color: '#2563EB' },
  { value: 'manager', label: 'Gerente', icon: 'briefcase-outline', color: '#D97706' },
  { value: 'admin', label: 'Administrador', icon: 'shield-checkmark', color: COLORS.primary },
];

function AdminUsersContent({ navigation }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('usuarios')
        .select('id, nome, email, telefone, role')
        .order('nome', { ascending: true });

      if (fetchError) throw fetchError;
      setUsuarios(data || []);
    } catch (err) {
      setError('Erro ao carregar usuários.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleEditRole = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setModalVisible(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser || !newRole) return;
    if (newRole === selectedUser.role) {
      setModalVisible(false);
      return;
    }

    try {
      setSaving(true);
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ role: newRole })
        .eq('id', selectedUser.id);

      if (updateError) {
        if (updateError.code === '42501') {
          Alert.alert('Acesso negado', 'Você não tem permissão para alterar roles.');
        } else {
          throw updateError;
        }
        return;
      }

      Alert.alert('Sucesso! ✅', `Role de ${selectedUser.nome} atualizada para "${newRole}".`);
      setModalVisible(false);
      loadUsers();
    } catch (err) {
      console.error('Erro ao atualizar role:', err);
      Alert.alert('Erro', 'Não foi possível atualizar a role.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = (user) => {
    Alert.alert(
      'Confirmar exclusão',
      `Deseja remover o usuário "${user.nome}" (${user.email})?\n\nEsta ação é irreversível.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: deleteError } = await supabase
                .from('usuarios')
                .delete()
                .eq('id', user.id);

              if (deleteError) throw deleteError;
              loadUsers();
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível remover o usuário. Verifique se não há dados vinculados.');
              console.error(err);
            }
          },
        },
      ]
    );
  };

  const getRoleBadge = (role) => {
    const option = ROLE_OPTIONS.find((r) => r.value === role);
    return option || { value: role, label: role, icon: 'person-outline', color: COLORS.gray600 };
  };

  const filteredUsers = usuarios.filter(
    (u) =>
      u.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const countByRole = (role) => usuarios.filter((u) => u.role === role).length;

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
          <View>
            <Text style={styles.title}>Gerenciar Usuários</Text>
            <Text style={styles.subtitle}>{usuarios.length} usuários cadastrados</Text>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.white} />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        </View>

        {/* Resumo por role */}
        <View style={styles.statsRow}>
          {ROLE_OPTIONS.map((opt) => (
            <View key={opt.value} style={styles.statCard}>
              <Ionicons name={opt.icon} size={20} color={opt.color} />
              <Text style={styles.statValue}>{countByRole(opt.value)}</Text>
              <Text style={styles.statLabel}>{opt.label}s</Text>
            </View>
          ))}
        </View>

        {/* Busca */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={COLORS.gray500} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome ou email..."
            placeholderTextColor={COLORS.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.gray500} />
            </TouchableOpacity>
          )}
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : !filteredUsers.length ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={COLORS.gray400} />
            <Text style={styles.emptyText}>Nenhum usuário encontrado.</Text>
          </View>
        ) : (
          filteredUsers.map((user) => {
            const badge = getRoleBadge(user.role);
            return (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={[styles.avatarCircle, { backgroundColor: badge.color + '20' }]}>
                    <Ionicons name={badge.icon} size={20} color={badge.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{user.nome}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: badge.color + '15' }]}>
                    <Text style={[styles.roleText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>
                {user.telefone && (
                  <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.infoText}>{user.telefone}</Text>
                  </View>
                )}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditRole(user)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.editButtonText}>Alterar Role</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteUser(user)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal de edição de Role */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alterar Role</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <View style={styles.modalUserInfo}>
                <Text style={styles.modalUserName}>{selectedUser.nome}</Text>
                <Text style={styles.modalUserEmail}>{selectedUser.email}</Text>
              </View>
            )}

            <Text style={styles.label}>Selecione a nova role:</Text>
            <View style={styles.roleOptionsContainer}>
              {ROLE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.roleOption,
                    newRole === opt.value && { borderColor: opt.color, backgroundColor: opt.color + '10' },
                  ]}
                  onPress={() => setNewRole(opt.value)}
                >
                  <Ionicons
                    name={opt.icon}
                    size={24}
                    color={newRole === opt.value ? opt.color : COLORS.gray500}
                  />
                  <Text
                    style={[
                      styles.roleOptionText,
                      newRole === opt.value && { color: opt.color, fontWeight: '700' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {newRole === opt.value && (
                    <Ionicons name="checkmark-circle" size={20} color={opt.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {newRole === 'admin' && (
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={18} color="#D97706" />
                <Text style={styles.warningText}>
                  Atenção: Este usuário terá acesso total ao sistema, incluindo gerenciamento de veículos, tarefas e outros usuários.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveRole}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveButtonText}>Salvar Alteração</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function AdminUsersScreen({ navigation }) {
  return (
    <AdminGuard navigation={navigation}>
      <AdminUsersContent navigation={navigation} />
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray100 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.gray100 },
  content: { padding: SPACING.md, gap: SPACING.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
  },
  adminBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  userHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  userEmail: { fontSize: 12, color: COLORS.textSecondary },
  roleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
  },
  roleText: { fontSize: 11, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingLeft: SPACING.xl + SPACING.sm },
  infoText: { fontSize: 13, color: COLORS.textSecondary },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm, paddingTop: SPACING.xs },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editButtonText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  deleteButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.md },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },
  errorText: { color: COLORS.danger, textAlign: 'center' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  modalUserInfo: { marginBottom: SPACING.md },
  modalUserName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  modalUserEmail: { fontSize: 13, color: COLORS.textSecondary },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  roleOptionsContainer: { gap: SPACING.sm, marginBottom: SPACING.md },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  roleOptionText: { flex: 1, fontSize: 15, color: COLORS.text },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: '#FFF4E6',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  warningText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
