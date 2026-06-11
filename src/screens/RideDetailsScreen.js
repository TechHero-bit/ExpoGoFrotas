import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Image,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import AdminGuard from '../components/AdminGuard';
import { supabase } from '../services/supabase';

export default function RideDetailsScreen({ route, navigation }) {
    const { journey } = route.params || {};
    const [selectedImage, setSelectedImage] = useState(null);

    if (!journey) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Detalhes da Corrida</Text>
                </View>
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>Dados da jornada nao encontrados.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'Nao registrado';
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR');
    };

    const motoristaNome = journey.usuarios?.nome || 'Desconhecido';
    const placa = journey.veiculos?.placa || 'Sem placa';
    const modelo = journey.veiculos?.modelo || 'Veiculo desconhecido';
    
    // Cálculo de KM se possivel
    let distPercorrida = 'N/A';
    if (journey.km_inicial !== undefined && journey.km_final !== undefined && journey.km_final !== null) {
        distPercorrida = `${(journey.km_final - journey.km_inicial).toFixed(1)} km`;
    }

    // Lógica para fotos de check-in/out
    const checkin = journey.checkins && journey.checkins.length > 0 ? journey.checkins[0] : null;
    const checkout = journey.checkouts && journey.checkouts.length > 0 ? journey.checkouts[0] : null;
    
    // Verificamos se existem fotos reais (ignorando os fallbacks textuais 'sem-imagem' do banco)
    const hasValidUrl = (url) => url && url !== 'sem-imagem' && typeof url === 'string' && url.length > 5;
    
    const resolveImageUrl = (pathOrUri) => {
        if (!hasValidUrl(pathOrUri)) return null;
        
        // Se for URL web válida ou fallback de teste local, mantém
        if (pathOrUri.startsWith('http') || pathOrUri.startsWith('file://') || pathOrUri.startsWith('content://')) {
            return pathOrUri;
        }
        
        // Se o banco salvar apenas o ID/Nome do arquivo, resolve com getPublicUrl
        const { data } = supabase.storage.from('evidencias').getPublicUrl(pathOrUri);
        return data.publicUrl;
    };
    
    const checkinSelfie = resolveImageUrl(checkin?.selfie_uri);
    const checkinPlaca = resolveImageUrl(checkin?.foto_placa_uri);
    const checkoutSelfie = resolveImageUrl(checkout?.selfie_uri);
    const checkoutVeiculo = resolveImageUrl(checkout?.foto_veiculo_uri);
    
    const hasAnyPhoto = checkinSelfie || checkinPlaca || checkoutSelfie || checkoutVeiculo;

    return (
        <AdminGuard navigation={navigation}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Detalhes da Corrida</Text>
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    
                    {/* Resumo Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.sectionTitle}>Status Atual</Text>
                            <View style={[styles.statusBadge, journey.status === 'Finalizada' ? styles.statusFinished : styles.statusActive]}>
                                <Text style={styles.statusText}>{journey.status}</Text>
                            </View>
                        </View>
                        <Text style={styles.bigId}>ID: {journey.id}</Text>
                    </View>

                    {/* Motorista e Veículo */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Envolvidos</Text>
                        
                        <View style={styles.infoBlock}>
                            <Ionicons name="person-outline" size={18} color={COLORS.primary} />
                            <View>
                                <Text style={styles.label}>Motorista</Text>
                                <Text style={styles.value}>{motoristaNome}</Text>
                            </View>
                        </View>
                        
                        <View style={styles.divider} />
                        
                        <View style={styles.infoBlock}>
                            <Ionicons name="car-outline" size={18} color={COLORS.primary} />
                            <View>
                                <Text style={styles.label}>Veiculo</Text>
                                <Text style={styles.value}>{modelo} - {placa}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Trajeto */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Trajeto</Text>
                        
                        <View style={styles.timelineItem}>
                            <View style={styles.timelineNodeContainer}>
                                <View style={styles.timelineDotStart} />
                                <View style={styles.timelineLine} />
                            </View>
                            <View style={styles.timelineContent}>
                                <Text style={styles.label}>Origem</Text>
                                <Text style={styles.value}>{journey.origem}</Text>
                                <Text style={styles.dateText}>{formatDate(journey.iniciado_em)}</Text>
                            </View>
                        </View>

                        <View style={styles.timelineItem}>
                            <View style={styles.timelineNodeContainer}>
                                <View style={styles.timelineDotEnd} />
                            </View>
                            <View style={styles.timelineContent}>
                                <Text style={styles.label}>Destino</Text>
                                <Text style={styles.value}>{journey.destino}</Text>
                                <Text style={styles.dateText}>{formatDate(journey.encerrado_em)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Odometro */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Odometro</Text>
                        <View style={styles.row}>
                            <View style={styles.halfCol}>
                                <Text style={styles.label}>KM Inicial</Text>
                                <Text style={styles.value}>{journey.km_inicial ?? 'N/A'}</Text>
                            </View>
                            <View style={styles.halfCol}>
                                <Text style={styles.label}>KM Final</Text>
                                <Text style={styles.value}>{journey.km_final ?? 'N/A'}</Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.row}>
                            <Text style={styles.label}>Distancia Percorrida:</Text>
                            <Text style={styles.highlightValue}>{distPercorrida}</Text>
                        </View>
                    </View>

                    {/* Fotos de Check-in */}
                    {(checkinSelfie || checkinPlaca) && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Fotos do Check-in</Text>
                            <View style={styles.photosRow}>
                                {checkinSelfie && (
                                    <View style={styles.photoContainer}>
                                        <Text style={styles.label}>Motorista</Text>
                                        <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedImage(checkinSelfie)}>
                                            <Image source={{ uri: checkinSelfie }} style={styles.photo} resizeMode="cover" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {checkinPlaca && (
                                    <View style={styles.photoContainer}>
                                        <Text style={styles.label}>Placa</Text>
                                        <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedImage(checkinPlaca)}>
                                            <Image source={{ uri: checkinPlaca }} style={styles.photo} resizeMode="cover" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Fotos de Check-out */}
                    {(checkoutSelfie || checkoutVeiculo) && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Fotos do Check-out</Text>
                            <View style={styles.photosRow}>
                                {checkoutSelfie && (
                                    <View style={styles.photoContainer}>
                                        <Text style={styles.label}>Motorista</Text>
                                        <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedImage(checkoutSelfie)}>
                                            <Image source={{ uri: checkoutSelfie }} style={styles.photo} resizeMode="cover" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {checkoutVeiculo && (
                                    <View style={styles.photoContainer}>
                                        <Text style={styles.label}>Veiculo</Text>
                                        <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedImage(checkoutVeiculo)}>
                                            <Image source={{ uri: checkoutVeiculo }} style={styles.photo} resizeMode="cover" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Fallback de Fotos */}
                    {!hasAnyPhoto && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Registro Fotografico</Text>
                            <View style={styles.noPhotosContainer}>
                                <Ionicons name="images-outline" size={32} color={COLORS.gray500} />
                                <Text style={styles.noPhotosText}>Nenhuma foto registrada para esta corrida.</Text>
                            </View>
                        </View>
                    )}

                </ScrollView>

                <Modal visible={!!selectedImage} transparent={true} animationType="fade" onRequestClose={() => setSelectedImage(null)}>
                    <View style={styles.modalContainer}>
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedImage(null)}>
                            <Ionicons name="close" size={32} color="#FFF" />
                        </TouchableOpacity>
                        {selectedImage && (
                            <Image source={{ uri: selectedImage }} style={styles.modalImage} resizeMode="contain" />
                        )}
                    </View>
                </Modal>
            </SafeAreaView>
        </AdminGuard>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.gray100 },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: SPACING.md, 
        paddingTop: SPACING.md,
        paddingBottom: SPACING.sm,
        gap: SPACING.sm,
    },
    backButton: {
        padding: SPACING.xs,
    },
    title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
    content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: COLORS.danger, fontSize: 16 },
    
    card: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.sm,
    },
    bigId: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontFamily: 'monospace',
    },
    statusBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.lg,
    },
    statusFinished: { backgroundColor: '#E6F5EA' },
    statusActive: { backgroundColor: '#FFF4E6' },
    statusText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
    
    infoBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginVertical: SPACING.xs,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: SPACING.sm,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    halfCol: {
        flex: 1,
    },
    
    label: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    value: {
        fontSize: 15,
        color: COLORS.text,
        fontWeight: '500',
    },
    highlightValue: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.primary,
    },
    dateText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },

    timelineItem: {
        flexDirection: 'row',
    },
    timelineNodeContainer: {
        width: 20,
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    timelineDotStart: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
        marginTop: 4,
    },
    timelineDotEnd: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.success || '#38A169',
        marginTop: 4,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: COLORS.border,
        marginVertical: 4,
    },
    timelineContent: {
        flex: 1,
        paddingBottom: SPACING.md,
    },
    
    // Fotos
    photosRow: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginTop: SPACING.xs,
    },
    photoContainer: {
        flex: 1,
        gap: 4,
    },
    photo: {
        width: '100%',
        height: 140,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.gray100,
    },
    noPhotosContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.lg,
        gap: SPACING.sm,
    },
    noPhotosText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    
    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 1,
        padding: SPACING.sm,
    },
    modalImage: {
        width: '100%',
        height: '80%',
    },
});
