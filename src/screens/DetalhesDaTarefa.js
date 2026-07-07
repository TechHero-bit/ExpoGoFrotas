import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { useRole } from '../contexts/RoleContext';

function normalizeStatus(status) {
  const value = `${status ?? ''}`.trim().toLowerCase();
  const mapping = {
    pendente: 'pendente',
    p: 'pendente',
    'em andamento': 'em_andamento',
    em_andamento: 'em_andamento',
    'em-andamento': 'em_andamento',
    interrompido: 'interrompido',
    interrompida: 'interrompido',
    finalizado: 'finalizado',
    finalizada: 'finalizado',
    concluida: 'finalizado',
    concluída: 'finalizado',
    'concluída': 'finalizado',
  };

  return mapping[value] || value || 'pendente';
}

function formatStatusLabel(status) {
  const normalized = normalizeStatus(status);
  const labels = {
    pendente: 'Pendente',
    em_andamento: 'Em andamento',
    interrompido: 'Interrompido',
    finalizado: 'Finalizado',
  };

  return labels[normalized] || 'Pendente';
}

function getStatusMeta(status) {
  const normalized = normalizeStatus(status);
  const meta = {
    pendente: {
      label: 'Pendente',
      color: '#B7791F',
      backgroundColor: '#FFF4E6',
      icon: 'time-outline',
    },
    em_andamento: {
      label: 'Em andamento',
      color: '#1D4ED8',
      backgroundColor: '#E8F1FF',
      icon: 'play-circle-outline',
    },
    interrompido: {
      label: 'Interrompido',
      color: '#C2410C',
      backgroundColor: '#FFF2E8',
      icon: 'pause-circle-outline',
    },
    finalizado: {
      label: 'Finalizado',
      color: '#15803D',
      backgroundColor: '#E8F8EE',
      icon: 'checkmark-circle-outline',
    },
  };

  return meta[normalized] || meta.pendente;
}

function formatDate(value) {
  if (!value) return 'Não definida';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Não definida';

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function updateTaskStatusWithFallback({ supabaseClient, taskId, novoStatus, assignedUserId, isAdmin = false }) {
  let updateQuery = supabaseClient
    .from('tarefas')
    .update({ status: novoStatus })
    .eq('id', taskId);

  // Somente adiciona filtro de atribuido_a para usuários normais (não-admins)
  if (assignedUserId && !isAdmin) {
    updateQuery = updateQuery.eq('atribuido_a', assignedUserId);
  }

  const { data, error } = await updateQuery.select('id');

  if (!error && data?.length) {
    return { data, error: null };
  }

  if (!error) {
    return { data: null, error: new Error('Nenhuma tarefa foi atualizada.') };
  }

  const isPermissionError = error?.code === '42501' || /permission|policy|rls/i.test(error?.message || '');
  if (!isPermissionError) {
    return { data: null, error };
  }

  const { data: rpcData, error: rpcError } = await supabaseClient.rpc('update_task_status', {
    task_id: taskId,
    new_status: novoStatus,
    user_id: assignedUserId,
  });

  if (rpcError) {
    return { data: null, error: rpcError };
  }

  return { data: rpcData, error: null };
}

export default function DetalhesDaTarefa({ route, navigation }) {
  const initialTask = route?.params?.task;
  const taskId = route?.params?.taskId ?? initialTask?.id;

  const [task, setTask] = useState(initialTask || null);
  const [vehicle, setVehicle] = useState(null);
  const [assignedUser, setAssignedUser] = useState(null);
  const [loading, setLoading] = useState(!initialTask);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();
  const { isAdmin } = useRole();

  useFocusEffect(
    useCallback(() => {
      if (!taskId) {
        setError('Nenhuma tarefa foi informada para exibição.');
        setLoading(false);
        return;
      }

      let isActive = true;

      const loadTask = async () => {
        try {
          setLoading(true);
          setError(null);

          const { data, error: fetchError } = await supabase
            .from('tarefas')
            .select('id, titulo, descricao, status, localizacao, veiculo_id, atribuido_a, agendado_em, data_limite')
            .eq('id', taskId)
            .maybeSingle();

          if (fetchError) throw fetchError;

          if (!isActive) return;

          if (!data) {
            setTask(null);
            setError('Tarefa não encontrada.');
            return;
          }

          setTask(data);

          if (data.veiculo_id) {
            const { data: vehicleData, error: vehicleError } = await supabase
              .from('veiculos')
              .select('id, placa, modelo')
              .eq('id', data.veiculo_id)
              .maybeSingle();

            if (!isActive) return;
            if (!vehicleError) {
              setVehicle(vehicleData);
            }
          } else {
            setVehicle(null);
          }

          if (data.atribuido_a) {
            const { data: userData, error: userError } = await supabase
              .from('usuarios')
              .select('id, nome')
              .eq('id', data.atribuido_a)
              .maybeSingle();

            if (!isActive) return;
            if (!userError) {
              setAssignedUser(userData);
            }
          } else {
            setAssignedUser(null);
          }
        } catch (err) {
          console.error('[TASK DETAILS] Erro ao carregar tarefa:', err);
          if (isActive) {
            setError('Não foi possível carregar os detalhes desta tarefa.');
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      loadTask();

      return () => {
        isActive = false;
      };
    }, [taskId])
  );

  const statusMeta = useMemo(() => getStatusMeta(task?.status), [task?.status]);
  const isDeadlineOverdue = Boolean(
    task?.data_limite && normalizeStatus(task?.status) !== 'finalizado' && new Date(task.data_limite) < new Date()
  );

  const handleUpdateStatus = async (novoStatus) => {
    if (!task?.id || isLoading) return;

    try {
      setIsLoading(true);

      let currentUserId = task?.atribuido_a ?? null;
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          currentUserId = authData.user.id;
        }
      } catch (authErr) {
        console.warn('[TASK DETAILS] Não foi possível resolver o usuário atual:', authErr);
      }

      const { error: updateError } = await updateTaskStatusWithFallback({
        supabaseClient: supabase,
        taskId: task.id,
        novoStatus,
        assignedUserId: currentUserId,
        isAdmin,
      });

      if (updateError) throw updateError;

      setTask((current) => (current ? { ...current, status: novoStatus } : current));
      Alert.alert('Sucesso', `Status atualizado para ${formatStatusLabel(novoStatus)}.`);

      if (normalizeStatus(novoStatus) === 'finalizado') {
        const targetTab = isAdmin ? 'AdminTasks' : 'Tasks';
        navigation.navigate('Main', { screen: targetTab });
      }
    } catch (err) {
      console.error('[TASK DETAILS] Falha ao atualizar status:', err);
      const message = err?.message?.includes('Acesso negado')
        ? 'Não foi possível atualizar o status porque a tarefa não pertence à sua conta ou a política de acesso ainda não foi aplicada no banco.'
        : 'Não foi possível atualizar o status da tarefa.';
      Alert.alert('Erro', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizarTarefa = () => {
    Alert.alert(
      'Confirmar conclusão',
      'Tem certeza de que deseja finalizar esta tarefa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'default',
          onPress: () => handleUpdateStatus('finalizado'),
        },
      ]
    );
  };

  const handleInterromperTarefa = () => {
    Alert.alert(
      'Confirmar interrupção',
      'Tem certeza de que deseja interromper esta tarefa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: () => handleUpdateStatus('interrompido'),
        },
      ]
    );
  };

  const renderActions = () => {
    const normalizedStatus = normalizeStatus(task?.status);

    if (normalizedStatus === 'finalizado') {
      return (
        <View style={styles.infoCard}>
          <Ionicons name="checkmark-done-circle-outline" size={22} color={COLORS.success} />
          <Text style={styles.completedMessage}>Esta tarefa foi concluída.</Text>
        </View>
      );
    }

    if (normalizedStatus === 'pendente') {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={() => handleUpdateStatus('em_andamento')}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <View style={styles.buttonRowContent}>
                <Text style={styles.primaryButtonText}>Iniciar Tarefa</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (normalizedStatus === 'em_andamento') {
      return (
        <View style={styles.actionColumn}>
          <TouchableOpacity
            style={[styles.buttonFinalize, isLoading && styles.buttonDisabled]}
            onPress={handleFinalizarTarefa}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <View style={styles.buttonRowContent}>
                <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} style={{ marginRight: SPACING.xs }} />
                <Text style={styles.primaryButtonText}>Finalizar Tarefa</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonInterrupt, isLoading && styles.buttonDisabled]}
            onPress={handleInterromperTarefa}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <View style={styles.buttonRowContent}>
                <Ionicons name="pause-circle-outline" size={18} color={COLORS.white} style={{ marginRight: SPACING.xs }} />
                <Text style={styles.secondaryButtonText}>Interromper Tarefa</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (normalizedStatus === 'interrompido') {
      return (
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={() => handleUpdateStatus('em_andamento')}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <View style={styles.buttonRowContent}>
              <Text style={styles.primaryButtonText}>Retomar Tarefa</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="clipboard-outline" size={44} color={COLORS.gray400} />
          <Text style={styles.emptyTitle}>Tarefa indisponível</Text>
          <Text style={styles.emptyText}>{error || 'Não foi possível localizar esta tarefa.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes da tarefa</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleCard}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{task.titulo || 'Sem título'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusMeta.backgroundColor }]}> 
              <Ionicons name={statusMeta.icon} size={16} color={statusMeta.color} />
              <Text style={[styles.statusText, { color: statusMeta.color }]}> {formatStatusLabel(task.status)}</Text>
            </View>
          </View>
          <Text style={styles.taskId}>Tarefa #{task.id}</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Descrição</Text>
          </View>
          <Text style={styles.cardText}>{task.descricao || 'Nenhuma descrição informada.'}</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Localização recomendada</Text>
          </View>
          <Text style={styles.cardText}>{task.localizacao || 'Não informado.'}</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="car-outline" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Veículo</Text>
          </View>
          <Text style={styles.cardText}>
            {vehicle ? `${vehicle.modelo || 'Veículo'} • ${vehicle.placa || 'Sem placa'}` : `Veículo ID: ${task.veiculo_id || 'Não informado'}`}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Responsável</Text>
          </View>
          <Text style={styles.cardText}>{assignedUser?.nome || `Atribuído a: ${task.atribuido_a || 'Não informado'}`}</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Cronograma</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Aberto em</Text>
            <Text style={styles.detailValue}>{formatDate(task.agendado_em)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Data limite</Text>
            <Text style={[styles.detailValue, isDeadlineOverdue && styles.overdueText]}>{formatDate(task.data_limite)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: SPACING.md + insets.bottom }]}>{renderActions()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  content: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  titleCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  taskId: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  detailValue: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flexShrink: 1,
    textAlign: 'right',
  },
  overdueText: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  footer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionRow: {
    flexDirection: 'row',
  },
  actionColumn: {
    gap: SPACING.sm,
  },
  primaryButton: {
    flex: 1,
    width: '100%',
    minHeight: 52,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonFinalize: {
    flex: 1,
    width: '100%',
    minHeight: 52,
    backgroundColor: '#2e7d32',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonInterrupt: {
    flex: 1,
    width: '100%',
    minHeight: 52,
    backgroundColor: '#d32f2f',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  secondaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  buttonRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    minHeight: 24,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    marginTop: SPACING.md,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  completedMessage: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '700',
  },
});
