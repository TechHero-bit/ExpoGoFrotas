import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import { useRole } from '../contexts/RoleContext';

/**
 * AdminGuard — Route Guard para telas de admin.
 *
 * Uso:
 *   <AdminGuard>
 *     <SuaTelaAdmin />
 *   </AdminGuard>
 *
 * Se o usuário NÃO for admin, exibe uma tela de "Acesso Negado"
 * em vez do conteúdo protegido.
 */
export default function AdminGuard({ children, navigation, fallbackMessage }) {
  const { isAdmin } = useRole();

  if (isAdmin) {
    return children;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="lock-closed" size={48} color={COLORS.white} />
      </View>
      <Text style={styles.title}>Acesso Restrito</Text>
      <Text style={styles.message}>
        {fallbackMessage ||
          'Esta área é exclusiva para administradores. Entre em contato com o gestor da frota para obter acesso.'}
      </Text>
      {navigation && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={18} color={COLORS.white} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * AdminOnly — Renderização condicional para elementos de UI.
 *
 * Uso:
 *   <AdminOnly>
 *     <BotaoDeCriarVeiculo />
 *   </AdminOnly>
 *
 * Se NÃO for admin, simplesmente não renderiza nada.
 * Opcionalmente, pode renderizar um fallback.
 */
export function AdminOnly({ children, fallback = null }) {
  const { isAdmin } = useRole();
  return isAdmin ? children : fallback;
}

/**
 * RoleVisible — Renderização condicional genérica por role.
 *
 * Uso:
 *   <RoleVisible roles={['admin', 'manager']}>
 *     <BotaoDeGerenciamento />
 *   </RoleVisible>
 */
export function RoleVisible({ roles = [], children, fallback = null }) {
  const { userRole } = useRole();
  return roles.includes(userRole) ? children : fallback;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    elevation: 6,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
