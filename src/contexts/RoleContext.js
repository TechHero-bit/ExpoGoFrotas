import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

/**
 * RoleContext — Contexto de Controle de Acesso Baseado em Regras (RBAC)
 *
 * Fornece:
 * - isAdmin: boolean — se o usuário logado é admin
 * - isDriver: boolean — se o usuário logado é motorista
 * - isManager: boolean — se o usuário logado é gerente
 * - userRole: string — a role textual ('admin', 'driver', 'manager')
 * - hasPermission(requiredRole): boolean — verificação genérica
 * - requireAdmin(): boolean — atalho para verificar admin
 */
const RoleContext = createContext({
  isAdmin: false,
  isDriver: true,
  isManager: false,
  userRole: 'driver',
  hasPermission: () => false,
  requireAdmin: () => false,
});

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole deve ser usado dentro de RoleProvider');
  }
  return context;
};

/**
 * Hierarquia de permissões:
 * admin > manager > driver
 */
const ROLE_HIERARCHY = {
  admin: 3,
  manager: 2,
  driver: 1,
};

export function RoleProvider({ children }) {
  const { profile } = useAuth();

  const userRole = profile?.role ?? 'driver';
  const isAdmin = userRole === 'admin';
  const isDriver = userRole === 'driver';
  const isManager = userRole === 'manager';

  /**
   * Verifica se o usuário possui permissão para uma role mínima exigida.
   * Ex: hasPermission('manager') retorna true para 'admin' e 'manager'.
   */
  const hasPermission = (requiredRole) => {
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 999;
    return userLevel >= requiredLevel;
  };

  /**
   * Atalho: verifica se é admin.
   */
  const requireAdmin = () => isAdmin;

  return (
    <RoleContext.Provider
      value={{
        isAdmin,
        isDriver,
        isManager,
        userRole,
        hasPermission,
        requireAdmin,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}
