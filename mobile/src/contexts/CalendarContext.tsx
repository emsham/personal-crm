import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import type { CalendarSettings, CalendarMapping, Task, Contact } from '../types';
import {
  initiateCalendarAuth,
  saveCalendarToken,
  parseCalendarToken,
  disconnectCalendar as disconnectCalendarAuth,
  CalendarToken,
  loadCachedCalendarToken,
  clearCachedCalendarToken,
} from '../services/calendarAuthService';
import {
  subscribeToCalendarSettings,
  updateCalendarSettings,
  subscribeToCalendarMappings,
  deleteAllCalendarMappings,
} from '../services/firestoreService';
import { subscribeToApiKeys } from '../services/apiKeyService';
import { deriveEncryptionKey, loadCachedEncryptionKeys } from '../shared/crypto';
import { fullSync } from '../services/calendarSyncService';
import { deleteCalendarEvent } from '../services/googleCalendarService';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface CalendarContextType {
  isConnected: boolean;
  isConnecting: boolean;
  settings: CalendarSettings | null;
  mappings: CalendarMapping[];
  token: CalendarToken | null;
  encryptionKey: string | null;
  connectCalendar: () => Promise<void>;
  disconnectCalendar: () => Promise<void>;
  updateSettings: (updates: Partial<CalendarSettings>) => Promise<void>;
  syncNow: (tasks: Task[], contacts: Contact[]) => Promise<void>;
  syncStatus: SyncStatus;
  lastError: string | null;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function useCalendar(): CalendarContextType {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}

interface CalendarProviderProps {
  children: ReactNode;
}

export function CalendarProvider({ children }: CalendarProviderProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CalendarSettings | null>(null);
  const [mappings, setMappings] = useState<CalendarMapping[]>([]);
  const [token, setToken] = useState<CalendarToken | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);

  const isConnected = !!token && (settings?.connected ?? false);

  // Derive encryption key when user logs in
  useEffect(() => {
    if (!user?.uid) {
      setEncryptionKey(null);
      return;
    }

    const initKey = async () => {
      const { mobileKey } = await loadCachedEncryptionKeys(user.uid);
      if (mobileKey) {
        setEncryptionKey(mobileKey);
      } else {
        const key = deriveEncryptionKey(user.uid, user.uid, false);
        setEncryptionKey(key);
      }
    };

    initKey();
  }, [user?.uid]);

  // Subscribe to calendar settings
  useEffect(() => {
    if (!user) {
      setSettings(null);
      return;
    }

    const unsubscribe = subscribeToCalendarSettings(user.uid, setSettings);
    return unsubscribe;
  }, [user]);

  // Subscribe to calendar mappings
  useEffect(() => {
    if (!user) {
      setMappings([]);
      return;
    }

    const unsubscribe = subscribeToCalendarMappings(user.uid, setMappings);
    return unsubscribe;
  }, [user]);

  // Load cached token first for fast startup
  useEffect(() => {
    loadCachedCalendarToken().then((cached) => {
      if (cached) {
        setToken(cached);
      }
    });
  }, []);

  // Subscribe to calendar token from Firestore
  useEffect(() => {
    if (!user || !encryptionKey) {
      setToken(null);
      return;
    }

    // Also derive web key for cross-platform compatibility
    const webKey = deriveEncryptionKey(user.uid, user.uid, true);

    const unsubscribe = subscribeToApiKeys(user.uid, encryptionKey, webKey, (keys) => {
      const calendarTokenStr = keys['googleCalendar'];
      if (calendarTokenStr) {
        const parsedToken = parseCalendarToken(calendarTokenStr);
        setToken(parsedToken);
        // If we just got a token and we were connecting, we're done
        if (isConnecting && parsedToken) {
          setIsConnecting(false);
        }
      } else {
        setToken(null);
        clearCachedCalendarToken();
      }
    });

    return unsubscribe;
  }, [user, encryptionKey, isConnecting]);

  const connectCalendar = useCallback(async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to connect your calendar.');
      return;
    }

    setIsConnecting(true);
    setLastError(null);

    try {
      // Open browser to web app's OAuth flow
      // The web app will handle the OAuth and save tokens to Firestore
      // We'll pick up the tokens via our Firestore subscription
      await initiateCalendarAuth(user.uid);

      // Note: isConnecting will be set to false when we receive the token
      // via the Firestore subscription, or after a timeout
      setTimeout(() => {
        setIsConnecting(false);
      }, 60000); // 1 minute timeout
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Failed to connect calendar');
      setIsConnecting(false);
    }
  }, [user]);

  const disconnectCalendar = useCallback(async () => {
    if (!user || !token || !encryptionKey) return;

    Alert.alert(
      'Disconnect Calendar',
      'All synced events will be removed from your Google Calendar. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setIsConnecting(true);
            try {
              // Delete all calendar events
              for (const mapping of mappings) {
                try {
                  await deleteCalendarEvent(user.uid, token, encryptionKey, mapping.googleEventId);
                } catch {
                  // Event may already be deleted
                }
              }

              // Delete all mappings
              await deleteAllCalendarMappings(user.uid);

              // Revoke token and delete from Firestore
              await disconnectCalendarAuth(user.uid, token);

              // Update settings
              await updateCalendarSettings(user.uid, { connected: false });

              setToken(null);
            } catch (error) {
              setLastError(error instanceof Error ? error.message : 'Failed to disconnect');
            } finally {
              setIsConnecting(false);
            }
          },
        },
      ]
    );
  }, [user, token, encryptionKey, mappings]);

  const handleUpdateSettings = useCallback(
    async (updates: Partial<CalendarSettings>) => {
      if (!user) return;
      await updateCalendarSettings(user.uid, updates);
    },
    [user]
  );

  const syncNow = useCallback(
    async (tasks: Task[], contacts: Contact[]) => {
      if (!user || !token || !settings || !encryptionKey) return;

      setSyncStatus('syncing');
      setLastError(null);

      try {
        const result = await fullSync(
          user.uid,
          token,
          encryptionKey,
          tasks,
          contacts,
          settings,
          (newToken) => setToken(newToken)
        );

        if (result.success) {
          setSyncStatus('success');
        } else {
          setSyncStatus('error');
          setLastError(`Synced ${result.synced} items with ${result.errors.length} errors`);
        }

        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (error) {
        setSyncStatus('error');
        setLastError(error instanceof Error ? error.message : 'Sync failed');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    },
    [user, token, settings, encryptionKey]
  );

  const value: CalendarContextType = {
    isConnected,
    isConnecting,
    settings,
    mappings,
    token,
    encryptionKey,
    connectCalendar,
    disconnectCalendar,
    updateSettings: handleUpdateSettings,
    syncNow,
    syncStatus,
    lastError,
  };

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}
