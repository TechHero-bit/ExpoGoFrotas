import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';

export default function AddressAutocomplete({ placeholder, onSelect, onChangeText, style }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);
  const debounceTimeout = useRef(null);
  const LOCATIONIQ_TOKEN = 'pk.2bd751445ee7150a339d49346a83657a';

  const formatLocationIQAddress = (address = {}, rawName = '') => {
    const street = address.road || address.pedestrian || address.footway || address.cycleway || address.highway || address.neighbourhood || address.suburb || address.village || address.city_district || address.town || address.city;
    const houseNumber = address.house_number;
    const neighborhood = address.suburb || address.neighbourhood || address.village || address.district || address.city_district || address.county;
    const city = address.city || address.town || address.village || address.county || address.state;

    if (!street && !city) {
      return rawName ? rawName.split(',').slice(0, 3).join(', ') : '';
    }

    const streetPart = street ? street : 'Endereço';
    const hasNeighborhood = Boolean(neighborhood);
    const hasCity = Boolean(city);
    const streetSegment = houseNumber ? `${streetPart}, ${houseNumber}` : streetPart;

    if (hasNeighborhood && hasCity) {
      return `${streetSegment} - ${neighborhood}, ${city}`;
    }

    if (hasNeighborhood) {
      return `${streetSegment} - ${neighborhood}`;
    }

    if (hasCity) {
      return `${streetSegment} - ${city}`;
    }

    return streetSegment;
  };

  const sortSuggestions = (items) => {
    return items.sort((a, b) => {
      const aHasNumber = a.address?.house_number ? 0 : 1;
      const bHasNumber = b.address?.house_number ? 0 : 1;
      if (aHasNumber !== bHasNumber) return aHasNumber - bHasNumber;
      return a.label.localeCompare(b.label);
    });
  };

  const fetchSuggestions = async (text) => {
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://api.locationiq.com/v1/autocomplete.php?key=${LOCATIONIQ_TOKEN}&q=${encodeURIComponent(text)}&countrycodes=br&limit=5&addressdetails=1&format=json`);
      const data = await response.json();
      const items = Array.isArray(data) ? data : [];

      const parsed = items
        .filter(item => {
          const lat = Number(item.lat);
          const lon = Number(item.lon);
          return !isNaN(lat) && !isNaN(lon);
        })
        .map((item) => ({
          ...item,
          label: formatLocationIQAddress(item.address, item.display_name),
          latitude: Number(item.lat),
          longitude: Number(item.lon),
        }));
      setSuggestions(sortSuggestions(parsed).slice(0, 5));
    } catch (error) {
      // Ignored error to prevent console logs as requested
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (text) => {
    setQuery(text);
    onChangeText?.(text);

    // Se o texto for limpo, reseta as sugestões imediatamente
    if (text.length < 3) {
      setSuggestions([]);
      setShowList(false);
    } else {
      setShowList(true);
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 800); // Aumentado para 800ms para reduzir carga enquanto digita
  };

  const handleSelect = (item) => {
    const label = item.label || '';
    const latitude = Number(item.latitude);
    const longitude = Number(item.longitude);

    if (isNaN(latitude) || isNaN(longitude)) {
      console.warn('[AddressAutocomplete] Item selecionado possui coordenadas inválidas:', item);
      return;
    }

    setQuery(label);
    setShowList(false);
    Keyboard.dismiss();
    onSelect({
      label,
      latitude,
      longitude,
    });
  };

  const clearInput = () => {
    setQuery('');
    setSuggestions([]);
    setShowList(false);
    onSelect(null);
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.gray600}
          value={query}
          onChangeText={handleTextChange}
          onFocus={() => { if (query.length >= 3) setShowList(true); }}
        />
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.iconRight} />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={clearInput} style={styles.iconRight}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {showList && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.place_id?.toString() || `${item.lat}-${item.lon}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
                <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.itemText} numberOfLines={2}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md,
    color: COLORS.text,
    fontSize: 14,
  },
  icon: {
    marginRight: SPACING.xs,
  },
  iconRight: {
    marginLeft: SPACING.xs,
    padding: 4,
  },
  dropdown: {
    position: 'absolute',
    top: 55, // Height of input approx
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    maxHeight: 220,
    zIndex: 1000,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  itemText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 13,
    color: COLORS.text,
  }
});
