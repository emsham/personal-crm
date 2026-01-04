import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
import { useLLMSettings } from '../contexts/LLMSettingsContext';
import {
  LoginScreen,
  HomeScreen,
  ContactsScreen,
  ContactDetailScreen,
  TasksScreen,
  AddContactScreen,
  AddTaskScreen,
  EditTaskScreen,
  LogInteractionScreen,
  EditInteractionScreen,
  DashboardScreen,
} from '../screens';

// Type definitions
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Dashboard: undefined;
  ContactDetail: { contactId: string };
  AddContact: undefined;
  AddTask: { contactId?: string };
  EditTask: { taskId: string };
  LogInteraction: { contactId?: string };
  EditInteraction: { interactionId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Contacts: undefined;
  Tasks: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Simple tab icons
const TabIcon: React.FC<{ name: string; focused: boolean; isAIConfigured?: boolean }> = ({ name, focused, isAIConfigured }) => {
  const icons: Record<string, string> = {
    Home: isAIConfigured ? '✨' : '📊',
    Contacts: '👥',
    Tasks: '✓',
    Settings: '⚙️',
  };
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.iconText, focused && styles.iconFocused]}>{icons[name]}</Text>
    </View>
  );
};

// Placeholder Settings screen
const SettingsScreen: React.FC = () => {
  const { signOut, user } = useAuth();
  return (
    <View style={styles.settingsContainer}>
      <Text style={styles.settingsTitle}>Settings</Text>
      <Text style={styles.settingsEmail}>{user?.email}</Text>
      <View style={styles.signOutButton}>
        <Text style={styles.signOutText} onPress={signOut}>
          Sign Out
        </Text>
      </View>
    </View>
  );
};

// Main tab navigator
const MainTabs: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { currentProviderConfigured } = useLLMSettings();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} isAIConfigured={currentProviderConfigured} />
        ),
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 60 + Math.max(insets.bottom - 8, 0),
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        headerStyle: {
          backgroundColor: '#0f172a',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: currentProviderConfigured ? 'AI' : 'Dashboard', headerShown: false }}
      />
      <Tab.Screen name="Contacts" component={ContactsScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

// Root navigator
export const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#fff',
        }}
      >
        {user ? (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ContactDetail"
              component={ContactDetailScreen}
              options={{ title: 'Contact' }}
            />
            <Stack.Screen
              name="AddContact"
              component={AddContactScreen}
              options={{ title: 'Add Contact', presentation: 'modal' }}
            />
            <Stack.Screen
              name="AddTask"
              component={AddTaskScreen}
              options={{ title: 'Add Task', presentation: 'modal' }}
            />
            <Stack.Screen
              name="EditTask"
              component={EditTaskScreen}
              options={{ title: 'Edit Task', presentation: 'modal' }}
            />
            <Stack.Screen
              name="LogInteraction"
              component={LogInteractionScreen}
              options={{ title: 'Log Interaction', presentation: 'modal' }}
            />
            <Stack.Screen
              name="EditInteraction"
              component={EditInteractionScreen}
              options={{ title: 'Edit Interaction', presentation: 'modal' }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Auth"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
    opacity: 0.6,
  },
  iconFocused: {
    opacity: 1,
  },
  settingsContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 24,
    alignItems: 'center',
    paddingTop: 60,
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  settingsEmail: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 32,
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
