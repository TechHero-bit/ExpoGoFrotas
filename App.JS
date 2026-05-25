import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View, Text } from 'react-native';
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
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import { supabase } from './src/services/supabase';
import { fetchUserProfile } from './src/services/dbService';
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

function AppTabs({ userRole }) {
  return (
    <Tab.Navigator
      initialRouteName={userRole === 'motorista' ? 'Home' : 'Fleet'}
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
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let authSubscription;

    const loadSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        if (data.session?.user?.id) {
          const userProfile = await fetchUserProfile(data.session.user.id);
          setProfile(userProfile);
        }
      } catch (error) {
        console.warn('Falha ao carregar sessão:', error.message || error);
      } finally {
        setInitializing(false);
      }
    };

    loadSession();

    authSubscription = supabase.auth.onAuthStateChange(async (_, sessionData) => {
      setSession(sessionData);
      if (sessionData?.user?.id) {
        const userProfile = await fetchUserProfile(sessionData.user.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    });

    return () => {
      authSubscription?.subscription?.unsubscribe();
    };
  }, []);

  if (initializing) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session && profile ? (
            <Stack.Screen name="Main">
              {() => <AppTabs userRole={profile.role ?? 'usuario'} />}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Auth" component={AuthStack} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
