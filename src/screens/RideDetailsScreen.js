import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Modal,
    InteractionManager,
    ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme';
import AdminGuard from '../components/AdminGuard';
import { supabase } from '../services/supabase';
import RouteMap from '../components/RouteMap';
import { fetchRoute, getJourneyRoutePoint, resolveJourneyRoutePoint } from '../services/osrmService';

// Labels para as fotos de veículo (mesma ordem do check-in/checkout)
const VEHICLE_PHOTO_LABELS = ['Frente', 'Lateral Esq.', 'Lateral Dir.', 'Traseira'];

export default function RideDetailsScreen({ route, navigation }) {
    const { journey } = route.params || {};
    const [selectedImage, setSelectedImage] = useState(null);

    // ── Callbacks memoizados para evitar re-renders ──
    const handleImagePress = useCallback((uri) => {
        setSelectedImage(uri);
    }, []);
    const handleCloseModal = useCallback(() => {
        setSelectedImage(null);
    }, []);

    // ── Estado do Mapa / Rota ──
    const [routeInfo, setRouteInfo] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeOrigin, setRouteOrigin] = useState(null);
    const [routeDestination, setRouteDestination] = useState(null);
    const [screenReady, setScreenReady] = useState(false);

    // Aguardar transição de tela antes de iniciar trabalho pesado
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            setScreenReady(true);
        });
        return () => task.cancel();
    }, []);

    // Calcular rota SOMENTE após a tela estar pronta (animação concluída)
    useEffect(() => {
        if (!screenReady || !journey?.origem || !journey?.destino) return;

        let cancelled = false;

        const calcRoute = async () => {
            try {
                setRouteLoading(true);
                const originCoord = await resolveJourneyRoutePoint(journey, 'origin');
                if (cancelled) return;
                const destCoord = await resolveJourneyRoutePoint(journey, 'destination');
                if (cancelled) return;

                if (!originCoord || !destCoord) {
                    setRouteOrigin(null);
                    setRouteDestination(null);
                    setRouteInfo(null);
                } else {
                    const result = await fetchRoute(originCoord, destCoord);
                    if (cancelled) return;
                    setRouteOrigin(originCoord);
                    setRouteDestination(destCoord);
                    setRouteInfo(result);
                }
            } catch (err) {
                console.warn('[RideDetails] Erro ao calcular rota:', err.message);
            } finally {
                if (!cancelled) setRouteLoading(false);
            }
        };

        calcRoute();

        return () => { cancelled = true; };
    }, [screenReady, journey?.origem, journey?.destino]);

    // ── Dados derivados (memoizados) ──
    const formatDate = useCallback((dateString) => {
        if (!dateString) return 'Nao registrado';
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR');
    }, []);

    const { motoristaNome, placa, modelo, distPercorrida } = useMemo(() => {
        const _motoristaNome = journey?.usuarios?.nome || 'Desconhecido';
        const _placa = journey?.veiculos?.placa || 'Sem placa';
        const _modelo = journey?.veiculos?.modelo || 'Veiculo desconhecido';

        let _distPercorrida = 'N/A';
        if (journey?.km_inicial !== undefined && journey?.km_final !== undefined && journey?.km_final !== null) {
            _distPercorrida = `${(journey.km_final - journey.km_inicial).toFixed(1)} km`;
        }

        return {
            motoristaNome: _motoristaNome,
            placa: _placa,
            modelo: _modelo,
            distPercorrida: _distPercorrida,
        };
    }, [journey]);

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

    const photoData = useMemo(() => {
        const checkin = journey?.checkins && journey.checkins.length > 0 ? journey.checkins[0] : null;
        const checkout = journey?.checkouts && journey.checkouts.length > 0 ? journey.checkouts[0] : null;

        const checkinSelfie = resolveImageUrl(checkin?.selfie_uri);
        const checkoutSelfie = resolveImageUrl(checkout?.selfie_uri);
        const checkinPainel = resolveImageUrl(checkin?.foto_painel_uri);
        const checkoutPainel = resolveImageUrl(checkout?.foto_painel_uri);

        const checkinVeiculos = (checkin?.foto_placa_uri || '').split(',').map(url => resolveImageUrl(url.trim())).filter(Boolean);
        const checkoutVeiculos = (checkout?.foto_veiculo_uri || '').split(',').map(url => resolveImageUrl(url.trim())).filter(Boolean);

        const hasAnyPhoto = checkinSelfie || checkinVeiculos.length > 0 || checkinPainel || checkoutSelfie || checkoutVeiculos.length > 0 || checkoutPainel;
        const checkinCombustivel = checkin?.nivel_combustivel?.trim() || 'Nao registrado';
        const checkoutCombustivel = checkout?.nivel_combustivel?.trim() || 'Nao registrado';

        return {
            checkinSelfie,
            checkoutSelfie,
            checkinPainel,
            checkoutPainel,
            checkinVeiculos,
            checkoutVeiculos,
            hasAnyPhoto,
            checkinCombustivel,
            checkoutCombustivel,
        };
    }, [journey]);

    // ── Fallback points memoizados para RouteMap (evita quebrar React.memo) ──
    const memoizedOriginFallback = useMemo(() => {
        return routeOrigin || getJourneyRoutePoint(journey, 'origin');
    }, [routeOrigin, journey]);

    const memoizedDestFallback = useMemo(() => {
        return routeDestination || getJourneyRoutePoint(journey, 'destination');
    }, [routeDestination, journey]);

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

    const {
        checkinSelfie, checkoutSelfie,
        checkinPainel, checkoutPainel,
        checkinVeiculos, checkoutVeiculos,
        hasAnyPhoto, checkinCombustivel, checkoutCombustivel
    } = photoData;

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

                    {/* Mapa Estático da Rota (Read-only) — Renderizado somente após tela pronta */}
                    {journey.origem && journey.destino && screenReady && (
                        routeLoading ? (
                            <View style={styles.mapLoadingPlaceholder}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                                <Text style={styles.mapLoadingText}>Calculando rota...</Text>
                            </View>
                        ) : (
                            <RouteMap
                                origin={memoizedOriginFallback}
                                destination={memoizedDestFallback}
                                routeInfo={routeInfo}
                                loading={false}
                                initialMode="minimized"
                                isInteractive={false}
                                showUserLocation={false}
                            />
                        )
                    )}

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

                    {/* Comparativo de combustivel e painel */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Combustivel e Painel</Text>
                        <View style={styles.comparisonRow}>
                            <View style={styles.comparisonCol}>
                                <Text style={styles.comparisonTitle}>Check-in</Text>
                                <Text style={styles.label}>Nivel de combustivel</Text>
                                <Text style={styles.value}>{checkinCombustivel}</Text>
                                <Text style={styles.label}>Foto do painel</Text>
                                {checkinPainel ? (
                                    <TouchableOpacity activeOpacity={0.8} onPress={() => handleImagePress(checkinPainel)}>
                                        <Image source={checkinPainel} style={styles.panelThumb} contentFit="cover" cachePolicy="disk" transition={200} />
                                    </TouchableOpacity>
                                ) : (
                                    <Text style={styles.subtleText}>Foto do painel nao registrada</Text>
                                )}
                            </View>

                            <View style={styles.comparisonCol}>
                                <Text style={styles.comparisonTitle}>Check-out</Text>
                                <Text style={styles.label}>Nivel de combustivel</Text>
                                <Text style={styles.value}>{checkoutCombustivel}</Text>
                                <Text style={styles.label}>Foto do painel</Text>
                                {checkoutPainel ? (
                                    <TouchableOpacity activeOpacity={0.8} onPress={() => handleImagePress(checkoutPainel)}>
                                        <Image source={checkoutPainel} style={styles.panelThumb} contentFit="cover" cachePolicy="disk" transition={200} />
                                    </TouchableOpacity>
                                ) : (
                                    <Text style={styles.subtleText}>Foto do painel nao registrada</Text>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Fotos de Check-in */}
                    {(checkinSelfie || checkinVeiculos.length > 0) && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Fotos do Check-in</Text>
                            <View style={styles.photosRow}>
                                {checkinSelfie && (
                                    <View style={styles.photoContainer}>
                                        <Text style={styles.label}>Selfie</Text>
                                        <TouchableOpacity activeOpacity={0.8} onPress={() => handleImagePress(checkinSelfie)}>
                                            <Image source={checkinSelfie} style={styles.photo} contentFit="cover" cachePolicy="disk" transition={200} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {checkinVeiculos.map((url, index) => (
                                    <View key={index} style={styles.photoContainer}>
                                        <Text style={styles.label}>{VEHICLE_PHOTO_LABELS[index] || `Veículo ${index + 1}`}</Text>
                                        <TouchableOpacity activeOpacity={0.8} onPress={() => handleImagePress(url)}>
                                            <Image source={url} style={styles.photo} contentFit="cover" cachePolicy="disk" transition={200} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Fotos de Check-out */}
                    {(checkoutSelfie || checkoutVeiculos.length > 0) && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Fotos do Check-out</Text>
                            <View style={styles.photosRow}>
                                {checkoutSelfie && (
                                    <View style={styles.photoContainer}>
                                        <Text style={styles.label}>Selfie</Text>
                                        <TouchableOpacity activeOpacity={0.8} onPress={() => handleImagePress(checkoutSelfie)}>
                                            <Image source={checkoutSelfie} style={styles.photo} contentFit="cover" cachePolicy="disk" transition={200} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {checkoutVeiculos.map((url, index) => (
                                    <View key={index} style={styles.photoContainer}>
                                        <Text style={styles.label}>{VEHICLE_PHOTO_LABELS[index] || `Veículo ${index + 1}`}</Text>
                                        <TouchableOpacity activeOpacity={0.8} onPress={() => handleImagePress(url)}>
                                            <Image source={url} style={styles.photo} contentFit="cover" cachePolicy="disk" transition={200} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
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

                <Modal visible={!!selectedImage} transparent={true} animationType="fade" onRequestClose={handleCloseModal}>
                    <View style={styles.modalContainer}>
                        <TouchableOpacity style={styles.modalCloseButton} onPress={handleCloseModal}>
                            <Ionicons name="close" size={32} color="#FFF" />
                        </TouchableOpacity>
                        {selectedImage && (
                            <Image source={selectedImage} style={styles.modalImage} contentFit="contain" cachePolicy="disk" transition={200} />
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
    
    // Mapa loading placeholder
    mapLoadingPlaceholder: {
        height: 150,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
    },
    mapLoadingText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },

    // Fotos
    photosRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
        marginTop: SPACING.xs,
    },
    comparisonRow: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginTop: SPACING.xs,
    },
    comparisonCol: {
        flex: 1,
        gap: 6,
    },
    comparisonTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: 2,
    },
    panelThumb: {
        width: '100%',
        height: 116,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: COLORS.gray100,
    },
    subtleText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },

    photoContainer: {
        width: '45%',
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
