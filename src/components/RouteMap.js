/**
 * RouteMap.js — Componente reutilizável de mapa com traçado de rota.
 *
 * Utiliza MapLibre GL Native para renderizar mapas OpenStreetMap gratuitos,
 * com suporte a:
 * - Traçado de rota via GeoJSON (LineLayer)
 * - Marcadores de Origem e Destino
 * - Localização em tempo real do usuário (blip azul)
 * - Dois modos: minimizado (preview) e expandido (modal fullscreen)
 * - Painel informativo com KM e ETA
 *
 * @module RouteMap
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Map,
  Camera,
  GeoJSONSource,
  Layer,
  Marker,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Verifica se um valor é uma coordenada válida (número finito).
 */
const isValidCoord = (val) => typeof val === 'number' && Number.isFinite(val);

/**
 * URL do estilo de tiles. Usando OpenFreeMap (tiles gratuitos de alta qualidade).
 * Alternativas:
 * - Demo tiles: "https://demotiles.maplibre.org/style.json"
 * - MapTiler: "https://api.maptiler.com/maps/streets/style.json?key=YOUR_KEY"
 */
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/**
 * @typedef {Object} MapPoint
 * @property {number} latitude   - Latitude
 * @property {number} longitude  - Longitude
 * @property {string} [label]    - Label do marcador
 */

/**
 * @typedef {Object} RouteData
 * @property {number}  distanceKm   - Distância em km
 * @property {number}  durationMin  - Duração em minutos
 * @property {Object}  geometry     - GeoJSON Feature (LineString)
 * @property {string}  [summary]    - Texto resumido
 */

/**
 * @typedef {Object} RouteMapProps
 * @property {MapPoint}    [origin]            - Ponto de origem
 * @property {MapPoint}    [destination]       - Ponto de destino
 * @property {RouteData}   [routeInfo]         - Dados da rota (do osrmService)
 * @property {boolean}     [showUserLocation]  - Mostrar blip azul do GPS
 * @property {boolean}     [isInteractive]     - Permitir gestos (zoom/pan)
 * @property {'minimized'|'expanded'} [initialMode] - Estado inicial
 * @property {boolean}     [loading]           - Exibir loading overlay
 * @property {Object}      [style]             - Estilo customizado do container
 * @property {Function}    [onExpand]          - Callback ao expandir
 * @property {Function}    [onCollapse]        - Callback ao minimizar
 */

/**
 * Componente de mapa reutilizável com suporte a rotas, marcadores e GPS.
 *
 * Memoizado para evitar re-renderizações desnecessárias.
 */
export default memo(function RouteMap({
  origin,
  destination,
  routeInfo,
  showUserLocation = false,
  isInteractive = true,
  initialMode = 'minimized',
  loading = false,
  style,
  onExpand,
  onCollapse,
}) {
  const [isExpanded, setIsExpanded] = useState(initialMode === 'expanded');
  const [mapReady, setMapReady] = useState(false);
  const cameraRef = useRef(null);
  const mapLoadedRef = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleMapLoaded = useCallback(() => {
    if (!mapLoadedRef.current) {
      mapLoadedRef.current = true;
      setMapReady(true);
    }
  }, []);

  // Animação de entrada
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Auto-zoom da rota e ajuste ao expandir
  useEffect(() => {
    if (!routeInfo || !cameraRef.current || !mapReady) return;

    const bounds = getBounds();
    if (bounds) {
      cameraRef.current.fitBounds(bounds, 50, 800);
    }
  }, [routeInfo, mapReady, isExpanded]);

  /**
   * Calcula os bounds para encaixar origem e destino no mapa.
   * Retorna [sw, ne] com padding.
   */
  const getBounds = useCallback(() => {
    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let hasPoints = false;

    const addPoint = (lng, lat) => {
      if (isValidCoord(lng) && isValidCoord(lat)) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        hasPoints = true;
      }
    };

    if (origin && isValidCoord(origin.latitude) && isValidCoord(origin.longitude)) {
      addPoint(origin.longitude, origin.latitude);
    }

    if (destination && isValidCoord(destination.latitude) && isValidCoord(destination.longitude)) {
      addPoint(destination.longitude, destination.latitude);
    }

    // Adicionar coordenadas da rota para bounds mais precisos
    if (routeInfo?.geometry?.geometry?.coordinates) {
      const coords = routeInfo.geometry.geometry.coordinates;
      for (let i = 0; i < coords.length; i++) {
        addPoint(coords[i][0], coords[i][1]);
      }
    }

    if (!hasPoints) return null;

    // MapLibre Camera bounds expects an array: [west, south, east, north]
    // which corresponds to [minLon, minLat, maxLon, maxLat]
    return [minLng, minLat, maxLng, maxLat];
  }, [origin, destination, routeInfo]);

  /**
   * Centro do mapa (fallback se bounds não estiver disponível).
   */
  const getCenter = useCallback(() => {
    const validOrigin = origin && isValidCoord(origin.latitude) && isValidCoord(origin.longitude);
    const validDest = destination && isValidCoord(destination.latitude) && isValidCoord(destination.longitude);

    if (validOrigin && validDest) {
      return [
        (origin.longitude + destination.longitude) / 2,
        (origin.latitude + destination.latitude) / 2,
      ];
    }
    if (validOrigin) return [origin.longitude, origin.latitude];
    if (validDest) return [destination.longitude, destination.latitude];
    // São Paulo como fallback
    return [-46.6333, -23.5505];
  }, [origin, destination]);

  const handleExpand = () => {
    setIsExpanded(true);
    onExpand?.();
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    onCollapse?.();
  };

  const handleMapPress = () => {
    if (!isExpanded || !isInteractive) return;

    const bounds = getBounds();
    if (bounds && cameraRef.current) {
      // fitBounds for version 10+ expects (boundsArray, padding, duration)
      // where boundsArray is [west, south, east, north]
      cameraRef.current.fitBounds(bounds, 60, 800);
    }
  };

  /**
   * Renderiza o conteúdo do mapa (usado tanto no modo minimizado quanto expandido).
   */
  const renderMapContent = (mapStyle) => {
    const bounds = getBounds();

    return (
      <Map
        style={mapStyle}
        mapStyle={MAP_STYLE_URL}
        androidView="texture"
        logoEnabled={false}
        attributionEnabled={false}
        scrollEnabled={isInteractive && isExpanded}
        zoomEnabled={isInteractive && isExpanded}
        rotateEnabled={false}
        pitchEnabled={false}
        onPress={handleMapPress}
        onMapLoaded={handleMapLoaded}
        onDidFinishLoadingMap={handleMapLoaded}
      >
        {/* Camera — encaixa nos bounds da rota */}
        {bounds ? (
          <Camera
            ref={cameraRef}
            bounds={bounds}
            padding={{
              paddingTop: 60,
              paddingBottom: 60,
              paddingLeft: 40,
              paddingRight: 40,
            }}
            easing="ease"
            duration={800}
          />
        ) : (
          <Camera
            ref={cameraRef}
            center={getCenter()}
            zoom={10}
            easing="ease"
            duration={800}
          />
        )}

        {/* Rota — GeoJSON LineString */}
        {routeInfo?.geometry && (
          <GeoJSONSource id="routeSource" data={routeInfo.geometry}>
            <Layer
              id="routeLine"
              type="line"
              paint={{
                'line-color': COLORS.primary,
                'line-width': 4,
                'line-cap': 'round',
                'line-join': 'round',
                'line-opacity': 0.85,
              }}
            />
          </GeoJSONSource>
        )}

        {/* Marcador de Origem */}
        {origin && isValidCoord(origin.latitude) && isValidCoord(origin.longitude) && (
          <Marker
            id="origin-marker"
            lngLat={[origin.longitude, origin.latitude]}
          >
            <View style={styles.markerOrigin}>
              <View style={styles.markerDot} />
            </View>
          </Marker>
        )}

        {/* Marcador de Destino */}
        {destination && isValidCoord(destination.latitude) && isValidCoord(destination.longitude) && (
          <Marker
            id="destination-marker"
            lngLat={[destination.longitude, destination.latitude]}
          >
            <View style={styles.markerDestination}>
              <View style={styles.markerDotGreen} />
            </View>
          </Marker>
        )}

        {/* Localização do Usuário (blip azul) */}
        {showUserLocation && (
          <UserLocation
            visible={true}
            animated={true}
          />
        )}
      </Map>
    );
  };

  /**
   * Renderiza o painel informativo flutuante (KM + ETA).
   */
  const renderInfoPanel = () => {
    if (!routeInfo) return null;

    return (
      <View style={styles.infoPanel}>
        <View style={styles.infoPanelRow}>
          <View style={styles.infoPanelItem}>
            <Ionicons name="navigate-outline" size={16} color={COLORS.primary} />
            <Text style={styles.infoPanelValue}>{routeInfo.distanceKm} km</Text>
          </View>
          <View style={styles.infoPanelDivider} />
          <View style={styles.infoPanelItem}>
            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
            <Text style={styles.infoPanelValue}>{routeInfo.durationMin} min</Text>
          </View>
        </View>
      </View>
    );
  };

  // ─── MODO EXPANDIDO (Modal Fullscreen) ───
  if (isExpanded && initialMode !== 'expanded') {
    return (
      <>
        {/* Trigger minimizado para manter o layout */}
        <TouchableOpacity
          style={[styles.minimizedContainer, style]}
          onPress={handleExpand}
          activeOpacity={0.9}
        >
          <View style={styles.minimizedPlaceholder}>
            <Ionicons name="map-outline" size={24} color={COLORS.primary} />
            <Text style={styles.minimizedText}>Mapa expandido</Text>
          </View>
        </TouchableOpacity>

        {/* Modal fullscreen */}
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={handleCollapse}
          statusBarTranslucent
        >
          <View style={styles.expandedContainer}>
            {/* Mapa fullscreen */}
            {renderMapContent(styles.expandedMap)}

            {/* Botão de fechar */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCollapse}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>

            {/* Painel informativo */}
            {renderInfoPanel()}

            {/* Labels dos marcadores */}
            <View style={styles.legendPanel}>
              {origin?.label && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                  <Text style={styles.legendText} numberOfLines={1}>{origin.label}</Text>
                </View>
              )}
              {destination?.label && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
                  <Text style={styles.legendText} numberOfLines={1}>{destination.label}</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // ─── MODO EXPANDIDO INLINE (para JourneyInProgress) ───
  if (initialMode === 'expanded') {
    return (
      <Animated.View style={[styles.expandedInlineContainer, style, { opacity: fadeAnim }]}>
        {renderMapContent(styles.expandedInlineMap)}

        {/* Loading overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Calculando rota...</Text>
          </View>
        )}

        {/* Painel informativo */}
        {renderInfoPanel()}
      </Animated.View>
    );
  }

  // ─── MODO MINIMIZADO ───
  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        style={[styles.minimizedContainer, style]}
        onPress={handleExpand}
        activeOpacity={0.9}
      >
        {/* Mini mapa */}
        <View style={styles.minimizedMapWrapper}>
          {renderMapContent(styles.minimizedMap)}

          {/* Overlay para capturar toque (evita que o mapa capture o gesto) */}
          <View style={styles.touchOverlay} />

          {/* Loading overlay */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Calculando rota...</Text>
            </View>
          )}
        </View>

        {/* Badge de informação */}
        {routeInfo && (
          <View style={styles.minimizedInfoBar}>
            <View style={styles.minimizedInfoContent}>
              <Ionicons name="navigate-outline" size={14} color={COLORS.primary} />
              <Text style={styles.minimizedInfoText}>
                {routeInfo.distanceKm} km · {routeInfo.durationMin} min
              </Text>
            </View>
            <View style={styles.expandHint}>
              <Text style={styles.expandHintText}>Toque para expandir</Text>
              <Ionicons name="expand-outline" size={14} color={COLORS.textSecondary} />
            </View>
          </View>
        )}

        {/* Sem rota calculada ainda */}
        {!routeInfo && !loading && (
          <View style={styles.minimizedInfoBar}>
            <Text style={styles.minimizedInfoTextMuted}>
              Toque para visualizar o mapa
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── ESTILOS ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Minimizado ──
  minimizedContainer: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  minimizedMapWrapper: {
    height: 150,
    position: 'relative',
  },
  minimizedMap: {
    flex: 1,
  },
  minimizedPlaceholder: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray100,
    gap: SPACING.xs,
  },
  minimizedText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  minimizedInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  minimizedInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  minimizedInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  minimizedInfoTextMuted: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  expandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandHintText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  touchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },

  // ── Expandido (Modal) ──
  expandedContainer: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  expandedMap: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },

  // ── Expandido Inline (JourneyInProgress) ──
  expandedInlineContainer: {
    height: 250,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  expandedInlineMap: {
    flex: 1,
  },

  // ── Painel de Informação ──
  infoPanel: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  infoPanelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  infoPanelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  infoPanelValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  infoPanelDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
  },

  // ── Legenda ──
  legendPanel: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.text,
    maxWidth: 180,
  },

  // ── Marcadores ──
  markerOrigin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  markerDestination: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(40, 167, 69, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDotGreen: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success || '#28A745',
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  // ── Loading ──
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
