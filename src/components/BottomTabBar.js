import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme';

const tabs = [
    { key: 'Status', icon: 'radio-button-on', label: 'Status' },
    { key: 'Tasks', icon: 'clipboard-outline', label: 'Tasks' },
    { key: 'Vehicle', icon: 'car-outline', label: 'Vehicle' },
    { key: 'Profile', icon: 'person-outline', label: 'Profile' },
];

export default function BottomTabBar({ activeTab = 'Status' }) {
    return (
        <View style={styles.container}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                    <TouchableOpacity key={tab.key} style={styles.tab} activeOpacity={0.7}>
                        <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                            <Ionicons
                                name={tab.icon}
                                size={22}
                                color={isActive ? COLORS.white : COLORS.gray500}
                            />
                        </View>
                        <Text style={[styles.label, isActive && styles.activeLabel]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingBottom: 20,
        paddingTop: 8,
        paddingHorizontal: SPACING.sm,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    iconContainer: {
        width: 40,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
    },
    activeIconContainer: {
        backgroundColor: COLORS.primary,
    },
    label: {
        fontSize: 11,
        color: COLORS.gray500,
        fontWeight: '500',
    },
    activeLabel: {
        color: COLORS.primary,
        fontWeight: '700',
    },
});