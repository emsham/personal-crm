import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { CalendarSettings, CalendarMapping, Task, Contact } from '../types';
import {
  initiateCalendarAuth,
  handleAuthCallback,
  disconnectCalendar as disconnectCalendarAuth,
  CalendarToken,
  parseCalendarToken,
  parseState,
} from '../services/calendarAuthService';
import {
  subscribeToCalendarSettings,
  updateCalendarSettings,
  subscribeToCalendarMappings,
  deleteAllCalendarMappings,
} from '../services/firestoreService';
import { subscribeToApiKeys } from '../services/apiKeyService';
import { deriveEncryptionKey } from '../shared/crypto';
import { fullSync } from '../services/calendarSyncService';
import { deleteCalendarEvent } from '../services/googleCalendarService';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface CalendarContextType {
  isConnected: boolean;
  isConnecting: boolean;
  settings: CalendarSettings | null;
  mappings: CalendarMapping[];
  token: CalendarToken | null;
  connectCalendar: () => Promise<void>;
  disconnectCalendar: () => Promise<void>;
  updateSettings: (updates: Partial<CalendarSettings>) => Promise<void>;
  syncNow: (tasks: Task[], contacts: Contact[]) => Promise<void>;
  syncStatus: SyncStatus;
  lastError: string | null;
  mobileRedirectPending: boolean;
  dismissMobileRedirect: () => void;
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [mobileRedirectPending, setMobileRedirectPending] = useState(false);

  const isConnected = !!token && (settings?.connected ?? false);

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

  // Subscribe to calendar token from encrypted API keys
  useEffect(() => {
    if (!user) {
      setToken(null);
      return;
    }

    const webKey = deriveEncryptionKey(user.uid, user.uid, false);
    const mobileKey = deriveEncryptionKey(user.uid, user.uid, true);

    const unsubscribe = subscribeToApiKeys(user.uid, webKey, mobileKey, (keys) => {
      const calendarTokenStr = keys['googleCalendar'];
      if (calendarTokenStr) {
        const parsedToken = parseCalendarToken(calendarTokenStr);
        setToken(parsedToken);
      } else {
        setToken(null);
      }
    });

    return unsubscribe;
  }, [user]);

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');

      if (code && state && window.location.pathname === '/auth/calendar/callback') {
        setIsConnecting(true);
        try {
          const isMobile = await handleAuthCallback(code, state);
          await updateCalendarSettings(user!.uid, { connected: true });

          if (isMobile) {
            // Show mobile redirect UI instead of navigating away
            setMobileRedirectPending(true);
          } else {
            // Clean up URL for web
            window.history.replaceState({}, '', '/settings');
          }
        } catch (error) {
          setLastError(error instanceof Error ? error.message : 'Failed to connect calendar');
          // For mobile errors, check if it was a mobile request
          const parsedState = parseState(state);
          if (parsedState?.mobile) {
            setMobileRedirectPending(true);
          }
        } finally {
          setIsConnecting(false);
        }
      }
    };

    if (user) {
      handleCallback();
    }
  }, [user]);

  // Listen for OAuth popup messages
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'calendar-auth-callback') {
        const { code, state } = event.data;
        if (code && state && user) {
          setIsConnecting(true);
          try {
            await handleAuthCallback(code, state);
            await updateCalendarSettings(user.uid, { connected: true });
          } catch (error) {
            setLastError(error instanceof Error ? error.message : 'Failed to connect calendar');
          } finally {
            setIsConnecting(false);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user]);

  const connectCalendar = useCallback(async () => {
    if (!user) throw new Error('User not authenticated');
    setIsConnecting(true);
    setLastError(null);
    try {
      await initiateCalendarAuth();
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Failed to initiate calendar auth');
      setIsConnecting(false);
    }
  }, [user]);

  const disconnectCalendar = useCallback(async () => {
    if (!user || !token) return;

    setIsConnecting(true);
    try {
      // Delete all calendar events
      for (const mapping of mappings) {
        try {
          await deleteCalendarEvent(user.uid, token, mapping.googleEventId);
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
      setLastError(error instanceof Error ? error.message : 'Failed to disconnect calendar');
    } finally {
      setIsConnecting(false);
    }
  }, [user, token, mappings]);

  const handleUpdateSettings = useCallback(
    async (updates: Partial<CalendarSettings>) => {
      if (!user) return;
      await updateCalendarSettings(user.uid, updates);
    },
    [user]
  );

  const syncNow = useCallback(
    async (tasks: Task[], contacts: Contact[]) => {
      if (!user || !token || !settings) return;

      setSyncStatus('syncing');
      setLastError(null);

      try {
        const result = await fullSync(user.uid, token, tasks, contacts, settings, (newToken) => {
          setToken(newToken);
        });

        if (result.success) {
          setSyncStatus('success');
        } else {
          setSyncStatus('error');
          setLastError(`Synced ${result.synced} items with ${result.errors.length} errors`);
        }

        // Reset status after 3 seconds
        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (error) {
        setSyncStatus('error');
        setLastError(error instanceof Error ? error.message : 'Sync failed');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    },
    [user, token, settings]
  );

  const dismissMobileRedirect = useCallback(() => {
    setMobileRedirectPending(false);
    window.history.replaceState({}, '', '/settings');
  }, []);

  const value: CalendarContextType = {
    isConnected,
    isConnecting,
    settings,
    mappings,
    token,
    connectCalendar,
    disconnectCalendar,
    updateSettings: handleUpdateSettings,
    syncNow,
    syncStatus,
    lastError,
    mobileRedirectPending,
    dismissMobileRedirect,
  };

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}
