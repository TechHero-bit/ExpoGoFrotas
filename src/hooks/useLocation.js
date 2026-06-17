/**
 * useLocation.js — Hook customizado para gerenciar localização GPS em tempo real.
 *
 * Utiliza `expo-location` para:
 * - Solicitar permissão de localização foreground
 * - Rastrear posição GPS continuamente (watchPositionAsync)
 * - Cleanup automático ao desmontar o componente
 *
 * @module useLocation
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';

/**
 * @typedef {Object} LocationState
 * @property {{ latitude: number, longitude: number } | null} location - Coordenada atual
 * @property {string | null} errorMsg         - Mensagem de erro (se houver)
 * @property {boolean}       isTracking       - Se o GPS está sendo rastreado
 * @property {boolean}       permissionGranted - Se a permissão foi concedida
 */

/**
 * @typedef {Object} UseLocationOptions
 * @property {boolean}  [enabled=false]         - Se o rastreamento deve iniciar automaticamente
 * @property {number}   [distanceInterval=10]   - Distância mínima (metros) entre atualizações
 * @property {number}   [timeInterval=3000]     - Intervalo mínimo (ms) entre atualizações
 * @property {string}   [accuracy='High']       - Precisão: 'Low', 'Balanced', 'High', 'BestForNavigation'
 */

const ACCURACY_MAP = {
  Low: Location.Accuracy.Low,
  Balanced: Location.Accuracy.Balanced,
  High: Location.Accuracy.High,
  BestForNavigation: Location.Accuracy.BestForNavigation,
};

/**
 * Hook para rastreamento de localização GPS em tempo real.
 *
 * @param {UseLocationOptions} [options={}] - Opções de configuração
 * @returns {LocationState & { startTracking: () => Promise<void>, stopTracking: () => void }}
 *
 * @example
 * const { location, errorMsg, isTracking, startTracking } = useLocation({ enabled: true });
 *
 * // location = { latitude: -23.5505, longitude: -46.6333 }
 */
export default function useLocation(options = {}) {
  const {
    enabled = false,
    distanceInterval = 10,
    timeInterval = 3000,
    accuracy = 'High',
  } = options;

  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  /** @type {React.MutableRefObject<Location.LocationSubscription | null>} */
  const watcherRef = useRef(null);

  /**
   * Solicita permissão de localização foreground.
   * @returns {Promise<boolean>} true se concedida
   */
  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setErrorMsg('Permissão de localização negada. Ative nas configurações do dispositivo.');
        setPermissionGranted(false);
        return false;
      }

      setPermissionGranted(true);
      setErrorMsg(null);
      return true;
    } catch (error) {
      console.error('[useLocation] Erro ao solicitar permissão:', error);
      setErrorMsg('Erro ao solicitar permissão de localização.');
      return false;
    }
  }, []);

  /**
   * Inicia o rastreamento GPS contínuo.
   */
  const startTracking = useCallback(async () => {
    // Evitar rastreamento duplo
    if (watcherRef.current) {
      console.warn('[useLocation] Rastreamento já ativo.');
      return;
    }

    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      console.log('[useLocation] Iniciando rastreamento GPS...');

      // Obter posição inicial imediatamente
      const initialPosition = await Location.getCurrentPositionAsync({
        accuracy: ACCURACY_MAP[accuracy] || Location.Accuracy.High,
      });

      setLocation({
        latitude: initialPosition.coords.latitude,
        longitude: initialPosition.coords.longitude,
      });

      // Iniciar watcher para atualizações contínuas
      watcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: ACCURACY_MAP[accuracy] || Location.Accuracy.High,
          distanceInterval,
          timeInterval,
        },
        (newLocation) => {
          setLocation({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          });
        }
      );

      setIsTracking(true);
      console.log('[useLocation] Rastreamento GPS ativo.');
    } catch (error) {
      console.error('[useLocation] Erro ao iniciar rastreamento:', error);
      setErrorMsg('Não foi possível acessar o GPS. Verifique se a localização está ativada.');
    }
  }, [accuracy, distanceInterval, timeInterval, requestPermission]);

  /**
   * Para o rastreamento GPS.
   */
  const stopTracking = useCallback(() => {
    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
      setIsTracking(false);
      console.log('[useLocation] Rastreamento GPS parado.');
    }
  }, []);

  // Auto-start se enabled=true
  useEffect(() => {
    if (enabled) {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    location,
    errorMsg,
    isTracking,
    permissionGranted,
    startTracking,
    stopTracking,
  };
}
