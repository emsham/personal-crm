import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Switch, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import { useLLMSettings } from '../contexts/LLMSettingsContext';
import { useNotifications } from '../contexts/NotificationContext';
import { LLMSettingsModal } from '../components/LLMSettingsModal';
import { LoadingDots } from '../components/ui';
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
import { EmailVerificationScreen } from '../screens/EmailVerificationScreen';

// Type definitions
export type RootStackParamList = {
  Auth: undefined;
  EmailVerification: undefined;
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

// Tab icons using Ionicons
const TabIcon: React.FC<{ name: string; focused: boolean; isAIConfigured?: boolean }> = ({ name, focused, isAIConfigured }) => {
  const getIconName = (): keyof typeof Ionicons.glyphMap => {
    switch (name) {
      case 'Home':
        return isAIConfigured
          ? (focused ? 'sparkles' : 'sparkles-outline')
          : (focused ? 'grid' : 'grid-outline');
      case 'Contacts':
        return focused ? 'people' : 'people-outline';
      case 'Tasks':
        return focused ? 'checkbox' : 'checkbox-outline';
      case 'Settings':
        return focused ? 'settings' : 'settings-outline';
      default:
        return 'ellipse-outline';
    }
  };

  return (
    <Ionicons
      name={getIconName()}
      size={22}
      color={focused ? '#3b82f6' : '#64748b'}
    />
  );
};

// Settings screen with notification settings
const SettingsScreen: React.FC = () => {
  const { signOut, user } = useAuth();
  const { permissionStatus, settings, updateSettings, requestPermission } = useNotifications();
  const { settings: llmSettings, currentProviderConfigured } = useLLMSettings();
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);

  const reminderOptions: { value: number; label: string }[] = [
    { value: 0, label: 'At time of task' },
    { value: 15, label: '15 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
    { value: 120, label: '2 hours before' },
  ];

  const getSelectedReminderLabel = (): string => {
    const option = reminderOptions.find((o) => o.value === settings.defaultReminderMinutes);
    return option?.label || '30 minutes before';
  };

  return (
    <ScrollView style={styles.settingsContainer} contentContainerStyle={styles.settingsContent}>
      <Text style={styles.settingsTitle}>Settings</Text>
      <Text style={styles.settingsEmail}>{user?.email}</Text>

      {/* AI Settings Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionHeader}>AI Assistant</Text>
        <TouchableOpacity
          style={styles.aiSettingsCard}
          onPress={() => setShowAISettings(true)}
        >
          <View style={styles.aiSettingsLeft}>
            <View style={[styles.aiIcon, currentProviderConfigured && styles.aiIconConfigured]}>
              <Ionicons name="sparkles" size={20} color="#fff" />
            </View>
            <View style={styles.aiSettingsInfo}>
              <Text style={styles.aiSettingsTitle}>
                {currentProviderConfigured
                  ? `${llmSettings.provider === 'gemini' ? 'Gemini' : 'OpenAI'} Connected`
                  : 'Configure AI Provider'}
              </Text>
              <Text style={styles.aiSettingsHint}>
                {currentProviderConfigured
                  ? 'Tap to change provider or API keys'
                  : 'Add your API key to enable AI features'}
              </Text>
            </View>
          </View>
          <View style={[styles.aiStatusDot, currentProviderConfigured ? styles.aiStatusActive : styles.aiStatusInactive]} />
        </TouchableOpacity>
      </View>

      {/* Notifications Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionHeader}>Notifications</Text>

        {permissionStatus !== 'granted' && (
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>
              {permissionStatus === 'denied' ? 'Notifications Denied - Open Settings' : 'Enable Notifications'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>All Notifications</Text>
            <Text style={styles.settingHint}>Master toggle for all notifications</Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={(value) => updateSettings({ enabled: value })}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.settingRow, !settings.enabled && styles.settingDisabled]}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Birthday Reminders</Text>
            <Text style={styles.settingHint}>Get notified on contact birthdays</Text>
          </View>
          <Switch
            value={settings.birthdaysEnabled}
            onValueChange={(value) => updateSettings({ birthdaysEnabled: value })}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor="#fff"
            disabled={!settings.enabled}
          />
        </View>

        <View style={[styles.settingRow, !settings.enabled && styles.settingDisabled]}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Important Dates</Text>
            <Text style={styles.settingHint}>Anniversaries and other dates</Text>
          </View>
          <Switch
            value={settings.importantDatesEnabled}
            onValueChange={(value) => updateSettings({ importantDatesEnabled: value })}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor="#fff"
            disabled={!settings.enabled}
          />
        </View>

        <View style={[styles.settingRow, !settings.enabled && styles.settingDisabled]}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Task Reminders</Text>
            <Text style={styles.settingHint}>Get notified for task due dates</Text>
          </View>
          <Switch
            value={settings.tasksEnabled}
            onValueChange={(value) => updateSettings({ tasksEnabled: value })}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor="#fff"
            disabled={!settings.enabled}
          />
        </View>

        <Text style={styles.settingSubheader}>Default Reminder Time</Text>
        <TouchableOpacity
          style={[styles.reminderPickerButton, !settings.enabled && styles.settingDisabled]}
          onPress={() => settings.enabled && setShowReminderPicker(!showReminderPicker)}
        >
          <Text style={styles.reminderPickerText}>{getSelectedReminderLabel()}</Text>
          <Text style={styles.dropdownArrow}>{showReminderPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showReminderPicker && (
          <View style={styles.reminderList}>
            {reminderOptions.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.reminderItem,
                  settings.defaultReminderMinutes === option.value && styles.reminderItemSelected,
                  index === reminderOptions.length - 1 && styles.reminderItemLast,
                ]}
                onPress={() => {
                  updateSettings({ defaultReminderMinutes: option.value });
                  setShowReminderPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.reminderItemText,
                    settings.defaultReminderMinutes === option.value && styles.reminderItemTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Account Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionHeader}>Account</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <LLMSettingsModal visible={showAISettings} onClose={() => setShowAISettings(false)} />
    </ScrollView>
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
        sceneContainerStyle: {
          backgroundColor: '#0f172a',
        },
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom || 0, 8),
          height: 60 + Math.max(insets.bottom || 0, 8),
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
  const { user, loading: authLoading, requiresEmailVerification } = useAuth();
  const { isLoading: llmLoading } = useLLMSettings();

  // Track if we should show loading overlay
  const isLoading = authLoading || (user && !requiresEmailVerification && llmLoading);

  // Fade animation for smooth transition
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    if (!isLoading && showOverlay) {
      // Fade out the loading overlay
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowOverlay(false);
      });
    } else if (isLoading && !showOverlay) {
      // Reset for next time
      setShowOverlay(true);
      fadeAnim.setValue(1);
    }
  }, [isLoading, showOverlay, fadeAnim]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <NavigatorContent user={user} requiresEmailVerification={requiresEmailVerification} />

      {/* Loading overlay with fade animation */}
      {showOverlay && (
        <Animated.View style={[styles.loadingOverlay, { opacity: fadeAnim }]}>
          <LoadingDots size="lg" />
        </Animated.View>
      )}
    </View>
  );
};

// Separated navigator content to avoid re-renders
const NavigatorContent: React.FC<{ user: any; requiresEmailVerification: boolean }> = ({
  user,
  requiresEmailVerification
}) => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#fff',
        }}
      >
        {!user ? (
          <Stack.Screen
            name="Auth"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : requiresEmailVerification ? (
          // Only show for email/password users who haven't verified
          // Google OAuth users bypass this since they're already verified
          <Stack.Screen
            name="EmailVerification"
            component={EmailVerificationScreen}
            options={{ headerShown: false }}
          />
        ) : (
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
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  settingsContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  settingsContent: {
    padding: 24,
    paddingTop: 60,
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  settingsEmail: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 32,
    textAlign: 'center',
  },
  settingsSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  aiSettingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  aiSettingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiIconConfigured: {
    backgroundColor: '#8b5cf6',
  },
  aiSettingsInfo: {
    flex: 1,
  },
  aiSettingsTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  aiSettingsHint: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  aiStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  aiStatusActive: {
    backgroundColor: '#22c55e',
  },
  aiStatusInactive: {
    backgroundColor: '#eab308',
  },
  permissionButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingDisabled: {
    opacity: 0.5,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  settingHint: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  settingSubheader: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 8,
    marginBottom: 12,
  },
  reminderPickerButton: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderPickerText: {
    color: '#fff',
    fontSize: 16,
  },
  dropdownArrow: {
    color: '#64748b',
    fontSize: 12,
  },
  reminderList: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  reminderItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  reminderItemSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  reminderItemLast: {
    borderBottomWidth: 0,
  },
  reminderItemText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  reminderItemTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
