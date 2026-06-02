import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabase';
import { fetchUserProfile } from '../services/dbService';
import {
  signUp,
  signIn,
  signOut,
  getCurrentSession,
} from '../services/authService';

/**
 * Contexto de Autenticação
 * 
 * Fornece:
 * - Estado de autenticação (session, user, profile)
 * - Funções de autenticação (login, logout, signup)
 * - Interceptação de deep links
 * - Gerenciamento de erro
 */
const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Carregar sessão inicial
  useEffect(() => {
    bootstrapAsync();
  }, []);

  // ✅ Interceptar deep links
  useEffect(() => {
    const handleDeepLink = async () => {
      // Cold start
      const url = await Linking.getInitialURL();
      if (url) {
        processDeepLink(url);
      }
    };

    handleDeepLink();

    // Quando app já está aberto
    const subscription = Linking.addEventListener('url', ({ url }) => {
      processDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  // ✅ Listener para mudanças de autenticação
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('📢 Auth state changed:', { event, newSession, userId: newSession?.user?.id });
        setSession(newSession);
        
        if (newSession?.user) {
          setUser(newSession.user);
          try {
            const userProfile = await fetchUserProfile(newSession.user.id);
            console.log('[DEBUG LOGITRACK] AuthContext onAuthStateChange userProfile:', { userId: newSession.user.id, userProfile });
            setProfile(userProfile);
          } catch (err) {
            console.error('Erro ao carregar perfil:', err);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  // ✅ Processar deep link recebido
  const processDeepLink = async (url) => {
    try {
      console.log('🔗 Processando deep link:', url);
      
      const { fragment, queryParams } = Linking.parse(url);
      let accessToken = null;
      let refreshToken = null;

      if (fragment) {
        const params = new URLSearchParams(fragment);
        accessToken = params.get('access_token');
        refreshToken = params.get('refresh_token');
      } else if (queryParams) {
        accessToken = queryParams.access_token;
        refreshToken = queryParams.refresh_token;
      }

      if (accessToken && refreshToken) {
        console.log('✅ Tokens encontrados, autenticando...');
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        console.log('[DEBUG LOGITRACK] supabase.auth.setSession response:', { data, error });

        if (error) {
          throw error;
        }

        console.log('✅ Autenticado via deep link!');
        setError(null);
      }
    } catch (err) {
      console.error('❌ Erro ao processar deep link:', err);
      setError(err.message);
      Alert.alert('Erro', 'Falha ao autenticar pelo link. Tente novamente.');
    }
  };

  // ✅ Carregar sessão (bootstrap)
  const bootstrapAsync = async () => {
    try {
      setLoading(true);
      const response = await supabase.auth.getSession();
      console.log('[DEBUG LOGITRACK] bootstrapAsync getSession response:', response);
      const { data, error } = response;

      if (error) {
        throw error;
      }
      
      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
        
        const userProfile = await fetchUserProfile(data.session.user.id);
        console.log('[DEBUG LOGITRACK] bootstrapAsync userProfile:', { userId: data.session.user.id, userProfile });
        setProfile(userProfile);
      }
      
      setError(null);
    } catch (err) {
      console.error('❌ Erro ao carregar sessão:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fazer login
  const login = async ({ email, password }) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await signIn({ email, password });
      console.log('[DEBUG LOGITRACK] login response:', data);
      console.log('✅ Login bem-sucedido');
      
      return data;
    } catch (err) {
      console.error('❌ Erro no login:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fazer signup
  const register = async ({ nome, telefone, email, password }) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await signUp({ nome, telefone, email, password });
      console.log('✅ Signup bem-sucedido, email de confirmação enviado');
      
      return data;
    } catch (err) {
      console.error('❌ Erro no signup:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fazer logout
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      console.log('✅ Logout bem-sucedido');
    } catch (err) {
      console.error('❌ Erro no logout:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ✅ Limpar erro
  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        // Estado
        session,
        user,
        profile,
        loading,
        error,
        isSignedIn: !!session,
        
        // Funções
        login,
        register,
        logout,
        clearError,
        reloadSession: bootstrapAsync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
