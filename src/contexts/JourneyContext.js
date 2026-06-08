import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { fetchActiveJourney } from '../services/dbService';

const STORAGE_KEY = '@logitrack_active_journey_id';

/**
 * JourneyContext — Gerencia o estado global da jornada ativa.
 *
 * Fornece:
 * - activeJourney: objeto da jornada ativa ou null
 * - journeyLoading: boolean de carregamento
 * - refreshJourney(): busca jornada ativa no Supabase e persiste no AsyncStorage
 * - clearJourney(): limpa estado local e AsyncStorage (pós-finalização)
 */
const JourneyContext = createContext({
  activeJourney: null,
  journeyLoading: true,
  refreshJourney: async () => {},
  clearJourney: async () => {},
});

export const useJourney = () => {
  const context = useContext(JourneyContext);
  if (!context) {
    throw new Error('useJourney deve ser usado dentro de JourneyProvider');
  }
  return context;
};

export function JourneyProvider({ children }) {
  const [activeJourney, setActiveJourney] = useState(null);
  const [journeyLoading, setJourneyLoading] = useState(true);

  // Bootstrap: verificar se existe jornada salva no AsyncStorage
  useEffect(() => {
    bootstrapJourney();
  }, []);

  const bootstrapJourney = async () => {
    try {
      setJourneyLoading(true);

      // Verificar se o usuário está autenticado
      const userResponse = await supabase.auth.getUser();
      const usuarioId = userResponse.data?.user?.id;
      if (!usuarioId) {
        setActiveJourney(null);
        return;
      }

      // Tentar buscar jornada ativa do banco
      const journey = await fetchActiveJourney(usuarioId);
      setActiveJourney(journey);

      // Persistir ou limpar no AsyncStorage
      if (journey?.id) {
        await AsyncStorage.setItem(STORAGE_KEY, String(journey.id));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }

      console.log('[JourneyContext] Bootstrap completo:', journey ? `Jornada ${journey.id} ativa` : 'Nenhuma jornada ativa');
    } catch (error) {
      console.warn('[JourneyContext] Erro no bootstrap:', error);
      setActiveJourney(null);
    } finally {
      setJourneyLoading(false);
    }
  };

  /**
   * Busca a jornada ativa do Supabase e atualiza o estado global.
   * Deve ser chamado após criar uma nova jornada (check-in).
   */
  const refreshJourney = useCallback(async () => {
    try {
      const userResponse = await supabase.auth.getUser();
      const usuarioId = userResponse.data?.user?.id;
      if (!usuarioId) return;

      const journey = await fetchActiveJourney(usuarioId);
      setActiveJourney(journey);

      if (journey?.id) {
        await AsyncStorage.setItem(STORAGE_KEY, String(journey.id));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }

      console.log('[JourneyContext] refreshJourney:', journey ? `Jornada ${journey.id}` : 'Nenhuma');
    } catch (error) {
      console.warn('[JourneyContext] Erro ao atualizar jornada:', error);
    }
  }, []);

  /**
   * Limpa o estado da jornada ativa.
   * Deve ser chamado após finalizar uma jornada (checkout).
   */
  const clearJourney = useCallback(async () => {
    try {
      setActiveJourney(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('[JourneyContext] Jornada limpa com sucesso');
    } catch (error) {
      console.warn('[JourneyContext] Erro ao limpar jornada:', error);
    }
  }, []);

  return (
    <JourneyContext.Provider
      value={{
        activeJourney,
        journeyLoading,
        refreshJourney,
        clearJourney,
      }}
    >
      {children}
    </JourneyContext.Provider>
  );
}
