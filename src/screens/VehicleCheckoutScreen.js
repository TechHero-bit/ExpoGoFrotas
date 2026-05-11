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

export default function VehicleCheckoutScreen({ navigation }) {
    const [observations, setObservations] = useState('');
    const [selfieUri, setSelfieUri] = useState(null);
    const [vehiclePhotoUri, setVehiclePhotoUri] = useState(null);

    const pickImage = async (setter) => {
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled) {
            setter(result.assets[0].uri);
        }
    };

    const handleFinish = () => {
        Alert.alert(
            'Finalizar Jornada',
            'Confirmar a entrega do veículo e encerramento da jornada?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            '✅ Jornada Finalizada!',
                            'Sua jornada foi encerrada com sucesso. Bom descanso!',
                            [
                                {
                                    text: 'OK',
                                    onPress: () => navigation.navigate('Dashboard'),
                                },
                            ]
                        );
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={26} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Checkout do Veículo</Text>
                <TouchableOpacity style={styles.helpBtn}>
                    <Ionicons name="help-circle-outline" size={26} color={COLORS.gray600} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Observations */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="list-outline" size={18} color={COLORS.text} />
                        <Text style={styles.cardTitle}>Observações</Text>
                    </View>
                    <Text style={styles.cardDescription}>
                        Relate quaisquer problemas, avarias ou detalhes importantes sobre o veículo antes de finalizar a jornada.
                    </Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Ex: Pneu dianteiro direito com desgaste irregular, nível de óleo baixo..."
                        placeholderTextColor={COLORS.gray400}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        value={observations}
                        onChangeText={setObservations}
                    />
                </View>

                {/* Selfie */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="person-add-outline" size={18} color={COLORS.text} />
                        <Text style={styles.cardTitle}>Selfie do Técnico</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.photoArea, selfieUri && styles.photoAreaFilled]}
                        onPress={() => pickImage(setSelfieUri)}
                        activeOpacity={0.8}
                    >
                        {selfieUri ? (
                            <Image source={{ uri: selfieUri }} style={styles.photoPreview} />
                        ) : (
                            <>
                                <Ionicons name="camera" size={32} color={COLORS.gray400} />
                                <Text style={styles.photoAreaText}>Tirar Foto</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Vehicle Photo */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="car-outline" size={18} color={COLORS.text} />
                        <Text style={styles.cardTitle}>Foto do Veículo</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.photoArea, vehiclePhotoUri && styles.photoAreaFilled]}
                        onPress={() => pickImage(setVehiclePhotoUri)}
                        activeOpacity={0.8}
                    >
                        {vehiclePhotoUri ? (
                            <Image source={{ uri: vehiclePhotoUri }} style={styles.photoPreview} />
                        ) : (
                            <>
                                <Ionicons name="camera" size={32} color={COLORS.gray400} />
                                <Text style={styles.photoAreaText}>Tirar Foto</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={{ height: 20 }} />
            </ScrollView>

            {/* Finish Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} activeOpacity={0.85}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                    <Text style={styles.finishBtnText}>Finalizar Jornada e Entregar Veículo</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.gray100 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, flex: 1, textAlign: 'center' },
    helpBtn: { padding: 4 },
    scrollContent: { padding: SPACING.md, gap: SPACING.md },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    cardDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 19,
        marginBottom: SPACING.sm,
    },
    textArea: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.sm,
        padding: SPACING.md,
        fontSize: 14,
        color: COLORS.text,
        minHeight: 90,
        backgroundColor: COLORS.white,
    },
    photoArea: {
        height: 120,
        borderWidth: 2,
        borderColor: '#FFB3B3',
        borderStyle: 'dashed',
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: '#FFF5F5',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        overflow: 'hidden',
    },
    photoAreaFilled: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.white,
    },
    photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
    photoAreaText: { fontSize: 14, color: COLORS.gray500, fontWeight: '500' },
    footer: {
        padding: SPACING.md,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    finishBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        elevation: 4,
    },
    finishBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});