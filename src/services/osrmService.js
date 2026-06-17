/**
 * osrmService.js — Serviço de roteamento usando OSRM (Open Source Routing Machine).
 *
 * Responsável por calcular rotas entre dois pontos usando a API pública do OSRM,
 * retornando distância, duração e geometria GeoJSON para desenho no mapa.
 *
 * @module osrmService
 */

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

/**
 * @typedef {Object} Coordinate
 * @property {number} latitude  - Latitude do ponto
 * @property {number} longitude - Longitude do ponto
 */

/**
 * @typedef {Object} RouteInfo
 * @property {number}   distanceKm   - Distância total da rota em quilômetros
 * @property {number}   durationMin  - Duração estimada da rota em minutos
 * @property {Object}   geometry     - GeoJSON LineString da rota
 * @property {string}   summary      - Texto resumido (ex: "45.2 km · 38 min")
 */

/**
 * Decodifica uma polyline encoded (formato Google Polyline Encoding) para
 * array de coordenadas [longitude, latitude] (formato GeoJSON).
 *
 * O OSRM retorna a geometry em polyline encoded por padrão.
 * Referência: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 *
 * @param {string} encoded - String da polyline encoded
 * @param {number} [precision=5] - Precisão da polyline (5 = padrão OSRM)
 * @returns {Array<[number, number]>} Array de [longitude, latitude]
 */
function decodePolyline(encoded, precision = 5) {
  const factor = Math.pow(10, precision);
  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    // Decodificar latitude
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    // Decodificar longitude
    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    // GeoJSON usa [longitude, latitude]
    coordinates.push([lng / factor, lat / factor]);
  }

  return coordinates;
}

/**
 * Busca uma rota entre dois pontos usando a API pública do OSRM.
 *
 * @param {Coordinate} origin      - Coordenada de origem { latitude, longitude }
 * @param {Coordinate} destination - Coordenada de destino { latitude, longitude }
 * @returns {Promise<RouteInfo>}   - Dados da rota calculada
 * @throws {Error} Erro de rede ou resposta inválida da API
 *
 * @example
 * const route = await fetchRoute(
 *   { latitude: -23.5505, longitude: -46.6333 },  // São Paulo
 *   { latitude: -22.9056, longitude: -47.0615 }   // Campinas
 * );
 * console.log(route.summary); // "95.3 km · 78 min"
 */
export async function fetchRoute(origin, destination) {
  // OSRM espera coordenadas no formato: longitude,latitude
  const originStr = `${origin.longitude},${origin.latitude}`;
  const destStr = `${destination.longitude},${destination.latitude}`;

  const url = `${OSRM_BASE_URL}/${originStr};${destStr}?overview=full&geometries=polyline&steps=false`;

  console.log('[osrmService] Buscando rota:', url);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(
        data.message || 'Nenhuma rota encontrada entre os pontos informados.'
      );
    }

    const route = data.routes[0];

    // Converter metros → km e segundos → minutos
    const distanceKm = parseFloat((route.distance / 1000).toFixed(1));
    const durationMin = Math.round(route.duration / 60);

    // Decodificar polyline para GeoJSON
    const coordinates = decodePolyline(route.geometry);

    const geometry = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates,
      },
    };

    const summary = `${distanceKm} km · ${durationMin} min`;

    console.log('[osrmService] Rota calculada:', summary);

    return {
      distanceKm,
      durationMin,
      geometry,
      summary,
    };
  } catch (error) {
    console.error('[osrmService] Erro ao buscar rota:', error.message);

    // Mensagens amigáveis em português
    if (error.message.includes('Network') || error.message.includes('network')) {
      throw new Error('Sem conexão com a internet. Verifique sua rede e tente novamente.');
    }

    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      throw new Error('O servidor de rotas demorou demais para responder. Tente novamente.');
    }

    throw error;
  }
}

/**
 * Calcula o ETA (Estimated Time of Arrival) com base na duração em minutos.
 *
 * @param {number} durationMin - Duração da rota em minutos
 * @returns {string} Horário estimado de chegada formatado (ex: "14:35")
 */
export function calculateETA(durationMin) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + durationMin);

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

/**
 * Coordenadas demo para desenvolvimento.
 * Serão substituídas por geocodificação real em uma fase posterior.
 *
 * @type {Object<string, Coordinate>}
 */
export const DEMO_LOCATIONS = {
  'Depósito Central': {
    latitude: -23.5505,
    longitude: -46.6333,
    label: 'Depósito Central',
  },
  'Centro de Distribuição Norte': {
    latitude: -22.9056,
    longitude: -47.0615,
    label: 'Centro de Distribuição Norte',
  },
  // Coordenadas fallback para locais não cadastrados
  _default_origin: {
    latitude: -23.5505,
    longitude: -46.6333,
    label: 'São Paulo, SP',
  },
  _default_destination: {
    latitude: -22.9056,
    longitude: -47.0615,
    label: 'Campinas, SP',
  },
};

/**
 * Resolve um nome de local para coordenadas.
 * Primeiro busca no mapa de locais demo, depois usa fallback.
 *
 * @param {string} locationName - Nome textual do local (ex: "Depósito Central")
 * @param {'origin'|'destination'} type - Tipo do ponto (para fallback)
 * @returns {Coordinate} Coordenada resolvida
 */
export function resolveLocation(locationName, type = 'origin') {
  if (DEMO_LOCATIONS[locationName]) {
    return DEMO_LOCATIONS[locationName];
  }

  console.warn(
    `[osrmService] Local "${locationName}" não encontrado no mapa demo. Usando fallback.`
  );

  return type === 'origin'
    ? DEMO_LOCATIONS._default_origin
    : DEMO_LOCATIONS._default_destination;
}
