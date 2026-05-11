import React from 'react';
import { View, Text, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';

const TASKS = [
    { title: 'Coleta no cliente A', subtitle: 'Rua dos Expedicionários, 125', status: 'Pendente' },
    { title: 'Entrega no cliente B', subtitle: 'Av. do Transporte, 805', status: 'Em andamento' },
    { title: 'Revisão programada', subtitle: 'Oficina Central', status: 'Agendada' },
];

export default function TasksScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Tarefas</Text>
                    <Text style={styles.subtitle}>Acompanhe rotas e eventos da frota</Text>
                </View>

                {TASKS.map((task, index) => (
                    <View key={`${task.title}-${index}`} style={styles.taskCard}>
                        <View style={styles.taskHeader}>
                            <Text style={styles.taskTitle}>{task.title}</Text>
                            <Text style={[styles.taskStatus, task.status === 'Em andamento' ? styles.statusActive : task.status === 'Pendente' ? styles.statusPending : styles.statusScheduled]}>
                                {task.status}
                            </Text>
                        </View>
                        <View style={styles.taskDetailRow}>
                            <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                            <Text style={styles.taskSubtitle}>{task.subtitle}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.gray100 },
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
});