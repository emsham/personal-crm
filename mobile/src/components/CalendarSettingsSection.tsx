import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useCalendar } from '../contexts/CalendarContext';
import type { Task, Contact } from '../types';

interface CalendarSettingsSectionProps {
  tasks: Task[];
  contacts: Contact[];
}

export function CalendarSettingsSection({ tasks, contacts }: CalendarSettingsSectionProps) {
  const {
    isConnected,
    isConnecting,
    settings,
    connectCalendar,
    disconnectCalendar,
    updateSettings,
    syncNow,
    syncStatus,
    lastError,
  } = useCalendar();

  const formatLastSync = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const syncToggles = [
    { key: 'syncTasks' as const, label: 'Tasks', description: 'Sync tasks with due dates' },
    { key: 'syncBirthdays' as const, label: 'Birthdays', description: 'Sync contact birthdays' },
    { key: 'syncImportantDates' as const, label: 'Important Dates', description: 'Sync custom dates' },
    { key: 'syncFollowUps' as const, label: 'Follow-ups', description: 'Sync follow-up reminders' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📆</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Calendar Integration</Text>
          <Text style={styles.subtitle}>Sync with Google Calendar</Text>
        </View>
      </View>

      {/* Connection Status */}
      <View style={styles.statusCard}>
        {isConnected ? (
          <View style={styles.statusRow}>
            <View style={styles.statusInfo}>
              <View style={[styles.statusIcon, styles.connectedIcon]}>
                <Text style={styles.connectedIconText}>✓</Text>
              </View>
              <View>
                <Text style={styles.statusTitle}>Connected to Google Calendar</Text>
                <Text style={styles.statusSubtitle}>
                  Last synced: {formatLastSync(settings?.lastSyncAt)}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={disconnectCalendar} disabled={isConnecting}>
              <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statusRow}>
            <View style={styles.statusInfo}>
              <View style={[styles.statusIcon, styles.disconnectedIcon]}>
                <Text style={styles.disconnectedIconText}>!</Text>
              </View>
              <View>
                <Text style={styles.statusTitle}>Not Connected</Text>
                <Text style={styles.statusSubtitle}>Connect to sync events</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.connectButton}
              onPress={connectCalendar}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.connectButtonText}>Connect</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Error Message */}
      {lastError && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{lastError}</Text>
        </View>
      )}

      {/* Sync Options */}
      {isConnected && settings && (
        <>
          <Text style={styles.sectionLabel}>SYNC SETTINGS</Text>
          {syncToggles.map(({ key, label, description }) => (
            <View key={key} style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>{label}</Text>
                <Text style={styles.toggleDescription}>{description}</Text>
              </View>
              <Switch
                value={settings[key]}
                onValueChange={(value) => updateSettings({ [key]: value })}
                trackColor={{ false: '#3e3e3e', true: '#4CAF50' }}
                thumbColor={settings[key] ? '#fff' : '#f4f3f4'}
              />
            </View>
          ))}

          {/* Sync Now Button */}
          <TouchableOpacity
            style={[styles.syncButton, syncStatus === 'syncing' && styles.syncButtonDisabled]}
            onPress={() => syncNow(tasks, contacts)}
            disabled={syncStatus === 'syncing'}
          >
            {syncStatus === 'syncing' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : syncStatus === 'success' ? (
              <Text style={styles.syncButtonText}>✓ Synced!</Text>
            ) : (
              <Text style={styles.syncButtonText}>Sync Now</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* Info Notice */}
      <View style={styles.infoCard}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          <Text style={styles.infoBold}>One-way sync.</Text> Events created in Tethru will appear
          on your Google Calendar. Changes sync automatically.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 22,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: '#252540',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  connectedIcon: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  connectedIconText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disconnectedIcon: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
  },
  disconnectedIconText: {
    color: '#FFC107',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  disconnectText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '500',
  },
  connectButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 90,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  errorCard: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#252540',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  toggleDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#252540',
    borderRadius: 12,
    padding: 12,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },
  infoBold: {
    color: '#aaa',
    fontWeight: '600',
  },
});

export default CalendarSettingsSection;
