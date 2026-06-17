import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';

export default function AddressAutocomplete({ placeholder, onSelect, style }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);
  const debounceTimeout = useRef(null);

  const fetchSuggestions = async (text) => {
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5`, {
        headers: {
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'User-Agent': 'LogiTrackApp/1.0'
        }
      });
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.warn('[Autocomplete Error]', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (text) => {
    setQuery(text);
    setShowList(true);
    
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    debounceTimeout.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 600);
  };

  const handleSelect = (item) => {
    setQuery(item.display_name);
    setShowList(false);
    Keyboard.dismiss();
    onSelect({
      label: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon)
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
            keyExtractor={(item) => item.place_id.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
                <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.itemText} numberOfLines={2}>
                  {item.display_name}
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
