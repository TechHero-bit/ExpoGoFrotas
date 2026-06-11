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
    TextInput,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { supabase } from '../services/supabase';
import AdminGuard from '../components/AdminGuard';

function AdminTasksContent({ navigation }) {
  const [tarefas, setTarefas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [atribuidoA, setAtribuidoA] = useState('');
  const [dataLimite, setDataLimite] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [tarefasRes, usuariosRes] = await Promise.all([
        supabase.from('tarefas').select('*').order('agendado_em', { ascending: false }),
        supabase.from('usuarios').select('id, nome, email, role'),
      ]);

      if (tarefasRes.error) throw tarefasRes.error;
      if (usuariosRes.error) throw usuariosRes.error;

      setTarefas(tarefasRes.data || []);
      setUsuarios(usuariosRes.data || []);
    } catch (err) {
      setError('Erro ao carregar tarefas.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTask = async () => {
    if (!titulo.trim() || !descricao.trim() || !atribuidoA) {
      Alert.alert('Campos obrigatórios', 'Preencha título, descrição e selecione um usuário.');
      return;
    }

    try {
      setSaving(true);
      const { error: insertError } = await supabase.from('tarefas').insert([
        {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          status: 'Pendente',
          localizacao: localizacao.trim() || null,
          atribuido_a: atribuidoA,
          agendado_em: new Date().toISOString(),
          data_limite: dataLimite ? new Date(dataLimite).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);

      if (insertError) {
        if (insertError.code === '42501') {
          Alert.alert('Acesso negado', 'Você não tem permissão para criar tarefas.');
        } else {
          throw insertError;
        }
        return;
      }

      Alert.alert('Sucesso! ✅', 'Tarefa criada com sucesso.');
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Erro ao criar tarefa:', err);
      Alert.alert('Erro', 'Não foi possível criar a tarefa.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = (taskId, taskTitle) => {
    Alert.alert(
      'Confirmar exclusão',
      `Deseja excluir a tarefa "${taskTitle}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: deleteError } = await supabase.from('tarefas').delete().eq('id', taskId);
              if (deleteError) throw deleteError;
              loadData();
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível excluir a tarefa.');
              console.error(err);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setTitulo('');
    setDescricao('');
    setLocalizacao('');
    setAtribuidoA('');
    setDataLimite('');
  };

  const getUserName = (userId) => {
    const user = usuarios.find((u) => u.id === userId);
    return user ? user.nome : 'Desconhecido';
  };

  const getStatusStyle = (status) => {
    if (status === 'Em andamento') return styles.statusActive;
    if (status === 'Pendente') return styles.statusPending;
    if (status === 'Concluída') return styles.statusDone;
    return styles.statusDefault;
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
          <View>
            <Text style={styles.title}>Gerenciar Tarefas</Text>
            <Text style={styles.subtitle}>{tarefas.length} tarefas cadastradas</Text>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.white} />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Nova Tarefa</Text>
        </TouchableOpacity>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : !tarefas.length ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={48} color={COLORS.gray400} />
            <Text style={styles.emptyText}>Nenhuma tarefa cadastrada.</Text>
          </View>
        ) : (
          tarefas.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskTitle}>{task.titulo}</Text>
                  <Text style={styles.taskDesc} numberOfLines={2}>
                    {task.descricao}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteTask(task.id, task.titulo)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
              <View style={styles.taskFooter}>
                <View style={[styles.statusBadge, getStatusStyle(task.status)]}>
                  <Text style={styles.statusText}>{task.status}</Text>
                </View>
                <View style={styles.assignedRow}>
                  <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.assignedText}>{getUserName(task.atribuido_a)}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal de criação */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Tarefa</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>Título *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Título da tarefa"
                  placeholderTextColor={COLORS.gray400}
                  value={titulo}
                  onChangeText={setTitulo}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Descrição *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Descreva a tarefa..."
                  placeholderTextColor={COLORS.gray400}
                  value={descricao}
                  onChangeText={setDescricao}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Localização</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Local da tarefa (opcional)"
                  placeholderTextColor={COLORS.gray400}
                  value={localizacao}
                  onChangeText={setLocalizacao}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Atribuir a *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.userList}>
                  {usuarios.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={[
                        styles.userChip,
                        atribuidoA === u.id && styles.userChipSelected,
                      ]}
                      onPress={() => setAtribuidoA(u.id)}
                    >
                      <Text
                        style={[
                          styles.userChipText,
                          atribuidoA === u.id && styles.userChipTextSelected,
                        ]}
                      >
                        {u.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleCreateTask}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Criar Tarefa</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function AdminTasksScreen({ navigation }) {
  return (
    <AdminGuard navigation={navigation}>
      <AdminTasksContent navigation={navigation} />
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  addButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  taskCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  taskHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  taskTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  taskDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.xs },
  deleteBtn: { padding: SPACING.xs },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusActive: { backgroundColor: '#E6F5EA' },
  statusPending: { backgroundColor: '#FFF4E6' },
  statusDone: { backgroundColor: '#EAF0FF' },
  statusDefault: { backgroundColor: COLORS.gray200 },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  assignedText: { fontSize: 12, color: COLORS.textSecondary },
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  modalScroll: { gap: SPACING.md },
  field: { marginBottom: SPACING.md },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
  input: {
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  userList: { flexDirection: 'row', paddingVertical: SPACING.xs },
  userChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.gray200,
    marginRight: SPACING.sm,
  },
  userChipSelected: {
    backgroundColor: COLORS.primary,
  },
  userChipText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  userChipTextSelected: { color: COLORS.white },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
