import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TextInput,
    Alert,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';

const FUEL_LEVELS = ['Reserva', '1/4', '1/2', '3/4', 'Cheio'];

export default function VehicleCheckinScreen({ navigation }) {
    const [selectedFuel, setSelectedFuel] = useState('1/2');
    const [km, setKm] = useState('');
    const [selfieUri, setSelfieUri] = useState(null);
    const [plateUri, setPlateUri] = useState(null);

    const pickImage = async (setter) => {
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled) {
            setter(result.assets[0].uri);
        }
    };

    const handleConfirm = () => {
        if (!km) {
            Alert.alert('Atenção', 'Por favor, informe o KM atual do veículo.');
            return;
        }
        navigation.navigate('JourneyInProgress');
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Check-in do Veículo</Text>
                </View>
                <View style={styles.headerRight}>
                    <Ionicons name="person-outline" size={22} color={COLORS.gray600} />
                    <Text style={styles.appName}>Logistics Pro</Text>
                    <TouchableOpacity>
                        <Ionicons name="notifications-outline" size={22} color={COLORS.gray700} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Map Placeholder */}
                <View style={styles.mapContainer}>
                    <View style={styles.mapPlaceholder}>
                        <View style={styles.mapPin}>
                            <Ionicons name="car" size={18} color={COLORS.white} />
                        </View>
                        <Text style={styles.mapText}>📍 Localização Atual</Text>
                    </View>
                </View>

                {/* Photo Cards */}
                <View style={styles.photoRow}>
                    <TouchableOpacity
                        style={styles.photoCard}
                        onPress={() => pickImage(setSelfieUri)}
                        activeOpacity={0.8}
                    >
                        {selfieUri ? (
                            <Image source={{ uri: selfieUri }} style={styles.photoPreview} />
                        ) : (
                            <>
                                <Ionicons name="camera-outline" size={28} color={COLORS.gray500} />
                                <Text style={styles.photoLabel}>Selfie do Técnico</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.photoCard}
                        onPress={() => pickImage(setPlateUri)}
                        activeOpacity={0.8}
                    >
                        {plateUri ? (
                            <Image source={{ uri: plateUri }} style={styles.photoPreview} />
                        ) : (
                            <>
                                <Ionicons name="car-outline" size={28} color={COLORS.gray500} />
                                <Text style={styles.photoLabel}>Foto da Placa</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Fuel Level */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Nível de Combustível</Text>
                    <View style={styles.fuelRow}>
                        {FUEL_LEVELS.map((level) => (
                            <TouchableOpacity
                                key={level}
                                style={[
                                    styles.fuelOption,
                                    selectedFuel === level && styles.fuelOptionActive,
                                ]}
                                onPress={() => setSelectedFuel(level)}
                            >
                                <Text
                                    style={[
                                        styles.fuelOptionText,
                                        selectedFuel === level && styles.fuelOptionTextActive,
                                    ]}
                                >
                                    {level}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* KM Input */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>KM Atual</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="speedometer-outline" size={18} color={COLORS.gray400} />
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: 45000"
                            placeholderTextColor={COLORS.gray400}
                            keyboardType="numeric"
                            value={km}
                            onChangeText={setKm}
                        />
                        <Text style={styles.inputSuffix}>km</Text>
                    </View>
                </View>

                <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Confirm Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                    <Text style={styles.confirmBtnText}>CONFIRMAR CHECK-IN</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    header: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.xs,
    },
    appName: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    backBtn: { padding: 2 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    scrollContent: { paddingBottom: 20 },
    mapContainer: {
        height: 160,
        margin: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        overflow: 'hidden',
        backgroundColor: '#B8D4B8',
    },
    mapPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#9EC49E',
        gap: SPACING.sm,
    },
    mapPin: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
    },
    mapText: { fontSize: 13, color: COLORS.gray700, fontWeight: '500' },
    photoRow: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        gap: SPACING.md,
        marginBottom: SPACING.md,
    },
    photoCard: {
        flex: 1,
        height: 110,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        backgroundColor: COLORS.gray100,
        overflow: 'hidden',
    },
    photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
    photoLabel: { fontSize: 12, color: COLORS.gray600, fontWeight: '500', textAlign: 'center' },
    section: { paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
    sectionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
    fuelRow: { flexDirection: 'row', gap: SPACING.xs },
    fuelOption: {
        flex: 1,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        backgroundColor: COLORS.white,
    },
    fuelOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    fuelOptionText: { fontSize: 11, color: COLORS.gray600, fontWeight: '600' },
    fuelOptionTextActive: { color: COLORS.white },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        gap: SPACING.sm,
        backgroundColor: COLORS.white,
    },
    input: { flex: 1, fontSize: 15, color: COLORS.text },
    inputSuffix: { fontSize: 13, color: COLORS.gray500 },
    bottomSpacer: { height: 20 },
    footer: {
        padding: SPACING.md,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        elevation: 3,
    },
    confirmBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});