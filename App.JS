import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from './src/screens/DashboardScreen';
import VehicleCheckinScreen from './src/screens/VehicleCheckinScreen';
import JourneyInProgressScreen from './src/screens/JourneyInProgressScreen';
import VehicleCheckoutScreen from './src/screens/VehicleCheckoutScreen';
import FleetScreen from './src/screens/FleetScreen';
import TasksScreen from './src/screens/TasksScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { COLORS } from './src/theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function HomeStackScreen() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="VehicleCheckin" component={VehicleCheckinScreen} />
            <Stack.Screen name="JourneyInProgress" component={JourneyInProgressScreen} />
            <Stack.Screen name="VehicleCheckout" component={VehicleCheckoutScreen} />
        </Stack.Navigator>
    );
}

export default function App() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <NavigationContainer>
                <StatusBar style="dark" />
                <Tab.Navigator
                    initialRouteName="Home"
                    screenOptions={({ route }) => ({
                        headerShown: false,
                        tabBarActiveTintColor: COLORS.primary,
                        tabBarInactiveTintColor: COLORS.gray500,
                        tabBarStyle: { height: 66, paddingBottom: 8, paddingTop: 8 },
                        tabBarIcon: ({ color, size }) => {
                            let iconName = 'home-outline';
                            if (route.name === 'Home') iconName = 'home-outline';
                            if (route.name === 'Fleet') iconName = 'car-outline';
                            if (route.name === 'Tasks') iconName = 'clipboard-outline';
                            if (route.name === 'Profile') iconName = 'person-outline';
                            return <Ionicons name={iconName} size={size} color={color} />;
                        },
                    })}
                >
                    <Tab.Screen name="Home" component={HomeStackScreen} options={{ tabBarLabel: 'Início' }} />
                    <Tab.Screen name="Fleet" component={FleetScreen} options={{ tabBarLabel: 'Frota' }} />
                    <Tab.Screen name="Tasks" component={TasksScreen} options={{ tabBarLabel: 'Tarefas' }} />
                    <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
                </Tab.Navigator>
            </NavigationContainer>
        </GestureHandlerRootView>
    );
}
