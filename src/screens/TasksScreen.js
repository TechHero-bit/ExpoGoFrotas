import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { supabase } from '../services/supabase';
import { fetchTarefas } from '../services/dbService';
import { formatStatusLabel, normalizeStatus } from '../utils/taskStatus';

export default function TasksScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true;

    const loadTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        setTasks([]);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          if (isActive) {
            setTasks([]);
            setError(null);
          }
          return;
        }

        console.log('[TASKS] user.id:', user.id);

        const lista = await fetchTarefas(user.id);
        if (isActive) {
          setError(null);
          setTasks(lista || []);
        }
      } catch (loadError) {
        console.error('[TASKS] Falha ao buscar tarefas:', loadError);
        console.error('Erro detalhado do Supabase:', loadError);
        if (isActive) {
          setError('Erro ao buscar tarefas. Tente novamente mais tarde.');
          setTasks([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadTasks();

    return () => {
      isActive = false;
    };
  }, []);

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
          <Text style={styles.title}>Tarefas</Text>
          <Text style={styles.subtitle}>Acompanhe rotas e eventos da frota</Text>
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : !tasks || tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Você não possui tarefas atribuídas no momento.</Text>
          </View>
        ) : (
          tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => navigation.navigate('DetalhesDaTarefa', { taskId: task.id })}
              activeOpacity={0.9}
            >
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle}>{task.titulo}</Text>
                <Text
                  style={[
                    styles.taskStatus,
                    normalizeStatus(task.status) === 'em_andamento'
                      ? styles.statusActive
                      : normalizeStatus(task.status) === 'pendente'
                      ? styles.statusPending
                      : normalizeStatus(task.status) === 'interrompido'
                      ? styles.statusInterrupted
                      : styles.statusDone,
                  ]}
                >
                  {formatStatusLabel(task.status)}
                </Text>
              </View>
              <View style={styles.taskDetailRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                <Text style={styles.taskSubtitle}>{task.localizacao || task.descricao || 'Sem local definido'}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray100 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.gray100 },
  content: { padding: SPACING.md, gap: SPACING.md },
  header: { gap: SPACING.xs },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary },
  taskCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  taskStatus: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.lg },
  statusActive: { backgroundColor: '#E6F5EA', color: COLORS.primary },
  statusPending: { backgroundColor: '#FFF4E6', color: '#FF8C00' },
  statusInterrupted: { backgroundColor: '#FFF2E8', color: '#C2410C' },
  statusDone: { backgroundColor: '#EAF0FF', color: '#1E3A8A' },
  taskDetailRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  taskSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  errorText: { color: COLORS.danger, textAlign: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, marginTop: SPACING.xl },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.md },
});
