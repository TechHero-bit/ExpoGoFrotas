import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { supabase } from '../services/supabase';
import { fetchTarefas } from '../services/dbService';

export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const userResponse = await supabase.auth.getUser();
        const userId = userResponse.data?.user?.id;

        if (!userId) {
          setError('Não foi possível identificar o usuário.');
          return;
        }

        const lista = await fetchTarefas(userId);
        setTasks(lista || []);
      } catch (loadError) {
        setError('Erro ao buscar tarefas.');
        console.warn(loadError);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
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
        ) : !tasks.length ? (
          <Text style={styles.emptyText}>Nenhuma tarefa encontrada para o seu perfil.</Text>
        ) : (
          tasks.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle}>{task.titulo}</Text>
                <Text
                  style={[
                    styles.taskStatus,
                    task.status === 'Em andamento'
                      ? styles.statusActive
                      : task.status === 'Pendente'
                      ? styles.statusPending
                      : styles.statusScheduled,
                  ]}
                >
                  {task.status}
                </Text>
              </View>
              <View style={styles.taskDetailRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                <Text style={styles.taskSubtitle}>{task.local || task.descricao || 'Sem local definido'}</Text>
              </View>
            </View>
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
  statusScheduled: { backgroundColor: '#EAF0FF', color: '#1E3A8A' },
  taskDetailRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  taskSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  errorText: { color: COLORS.danger, textAlign: 'center' },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center' },
});
