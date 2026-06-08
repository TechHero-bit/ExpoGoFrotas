import React, { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
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

// ========== RBAC: Novas telas admin ==========
import CreateVehicleScreen from './src/screens/CreateVehicleScreen';
import AdminTasksScreen from './src/screens/AdminTasksScreen';
import AdminUsersScreen from './src/screens/AdminUsersScreen';

import { supabase } from './src/services/supabase';
import { fetchUserProfile } from './src/services/dbService';
import { COLORS } from './src/theme';

// ========== RBAC: Context Providers ==========
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { RoleProvider, useRole } from './src/contexts/RoleContext';
import { JourneyProvider } from './src/contexts/JourneyContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ========== Fleet Stack: inclui tela de criar veiculo (protegida pelo AdminGuard interno) ==========
function FleetStackScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FleetList" component={FleetScreen} />
      <Stack.Screen name="CreateVehicle" component={CreateVehicleScreen} />
    </Stack.Navigator>
  );
}

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

function AppTabs() {
  const { profile } = useAuth();
  const { isAdmin } = useRole();
  const userRole = profile?.role ?? 'driver';

  return (
    <Tab.Navigator
      initialRouteName={userRole === 'driver' ? 'Home' : 'Fleet'}
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
          // RBAC: icones admin
          if (route.name === 'AdminTasks') iconName = 'clipboard-outline';
          if (route.name === 'AdminUsers') iconName = 'people-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackScreen} options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Fleet" component={FleetStackScreen} options={{ tabBarLabel: 'Frota' }} />

      {/* ========== RBAC: Tabs condicionais para admin ========== */}
      {isAdmin ? (
        <>
          <Tab.Screen
            name="AdminTasks"
            component={AdminTasksScreen}
            options={{ tabBarLabel: 'Tarefas' }}
          />
          <Tab.Screen
            name="AdminUsers"
            component={AdminUsersScreen}
            options={{
              tabBarLabel: 'Usuarios',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="people-outline" size={size} color={color} />
              ),
            }}
          />
        </>
      ) : (
        <Tab.Screen name="Tasks" component={TasksScreen} options={{ tabBarLabel: 'Tarefas' }} />
      )}

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

// ========== Componente interno que usa os contexts ==========
function AppContent() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session && profile ? (
          <Stack.Screen name="Main" component={AppTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ========== App raiz: providers aninhados ==========
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RoleProvider>
          <JourneyProvider>
            <AppContent />
          </JourneyProvider>
        </RoleProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
