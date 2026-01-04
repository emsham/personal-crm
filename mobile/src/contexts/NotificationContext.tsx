import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Contact, Task } from '../types';
import * as notificationService from '../services/notificationService';

const STORAGE_KEYS = {
  SETTINGS: 'nexus_notification_settings',
  SCHEDULED_IDS: 'nexus_notification_scheduled_ids',
};

export interface NotificationSettings {
  enabled: boolean;
  birthdaysEnabled: boolean;
  importantDatesEnabled: boolean;
  tasksEnabled: boolean;
  defaultReminderMinutes: number; // Default reminder time before tasks (0 = no reminder)
}

interface ScheduledNotificationIds {
  birthdays: Record<string, string>; // contactId -> notificationId
  importantDates: Record<string, string>; // `${contactId}_${dateId}` -> notificationId
  tasks: Record<string, string[]>; // taskId -> [notificationIds] (can have multiple: at time + reminder)
}

interface NotificationContextValue {
  permissionStatus: 'granted' | 'denied' | 'undetermined' | 'loading';
  settings: NotificationSettings;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  requestPermission: () => Promise<boolean>;
  scheduleContactNotifications: (contacts: Contact[]) => Promise<void>;
  scheduleTaskNotifications: (tasks: Task[]) => Promise<void>;
  cancelTaskNotifications: (taskId: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  birthdaysEnabled: true,
  importantDatesEnabled: true,
  tasksEnabled: true,
  defaultReminderMinutes: 30, // 30 minutes before by default
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined' | 'loading'>('loading');
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [scheduledIds, setScheduledIds] = useState<ScheduledNotificationIds>({
    birthdays: {},
    importantDates: {},
    tasks: {},
  });
  const isInitialized = useRef(false);

  // Load settings and scheduled IDs on mount
  useEffect(() => {
    loadInitialState();
  }, []);

  const loadInitialState = async () => {
    try {
      // Load settings
      const storedSettings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (storedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(storedSettings) });
      }

      // Load scheduled IDs
      const storedIds = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULED_IDS);
      if (storedIds) {
        setScheduledIds(JSON.parse(storedIds));
      }

      // Check permission status
      const status = await notificationService.getPermissionStatus();
      setPermissionStatus(status);
      isInitialized.current = true;
    } catch (error) {
      console.error('Error loading notification state:', error);
      setPermissionStatus('undetermined');
      isInitialized.current = true;
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const saveScheduledIds = async (ids: ScheduledNotificationIds) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SCHEDULED_IDS, JSON.stringify(ids));
    } catch (error) {
      console.error('Error saving scheduled notification IDs:', error);
    }
  };

  const updateSettings = useCallback(async (updates: Partial<NotificationSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, [settings]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await notificationService.requestPermissions();
    setPermissionStatus(granted ? 'granted' : 'denied');
    return granted;
  }, []);

  const scheduleContactNotifications = useCallback(async (contacts: Contact[]) => {
    if (!settings.enabled || permissionStatus !== 'granted') return;

    const newBirthdayIds: Record<string, string> = {};
    const newImportantDateIds: Record<string, string> = {};

    // Cancel existing birthday/important date notifications
    const existingBirthdayIds = Object.values(scheduledIds.birthdays);
    const existingImportantDateIds = Object.values(scheduledIds.importantDates);
    await notificationService.cancelNotifications([...existingBirthdayIds, ...existingImportantDateIds]);

    const now = new Date();
    const currentYear = now.getFullYear();

    for (const contact of contacts) {
      const contactName = `${contact.firstName} ${contact.lastName}`.trim();

      // Schedule birthday notification
      if (settings.birthdaysEnabled && contact.birthday) {
        const [month, day] = contact.birthday.split('-').map(Number);
        if (month && day) {
          const birthdayDate = getNextOccurrence(month, day, currentYear);
          if (birthdayDate > now) {
            const notifId = await notificationService.scheduleBirthdayNotification(
              contactName,
              birthdayDate,
              contact.id
            );
            if (notifId) {
              newBirthdayIds[contact.id] = notifId;
            }
          }
        }
      }

      // Schedule important date notifications
      if (settings.importantDatesEnabled && contact.importantDates) {
        for (const importantDate of contact.importantDates) {
          const [month, day] = importantDate.date.split('-').map(Number);
          if (month && day) {
            const dateOccurrence = getNextOccurrence(month, day, currentYear);
            if (dateOccurrence > now) {
              const notifId = await notificationService.scheduleImportantDateNotification(
                contactName,
                importantDate.label,
                dateOccurrence,
                contact.id,
                importantDate.id
              );
              if (notifId) {
                newImportantDateIds[`${contact.id}_${importantDate.id}`] = notifId;
              }
            }
          }
        }
      }
    }

    const newScheduledIds = {
      ...scheduledIds,
      birthdays: newBirthdayIds,
      importantDates: newImportantDateIds,
    };
    setScheduledIds(newScheduledIds);
    await saveScheduledIds(newScheduledIds);
  }, [settings, permissionStatus, scheduledIds]);

  const scheduleTaskNotifications = useCallback(async (tasks: Task[]) => {
    if (!settings.enabled || !settings.tasksEnabled || permissionStatus !== 'granted') return;

    const newTaskIds: Record<string, string[]> = {};

    // Cancel all existing task notifications
    const existingTaskIds = Object.values(scheduledIds.tasks).flat();
    await notificationService.cancelNotifications(existingTaskIds);

    const now = new Date();

    for (const task of tasks) {
      // Skip completed tasks or tasks without due dates
      if (task.completed || !task.dueDate) continue;

      const notificationIds: string[] = [];

      // Parse due date and time
      const dueDate = new Date(task.dueDate);

      if (task.dueTime) {
        // If time is set, use exact time
        const [hours, minutes] = task.dueTime.split(':').map(Number);
        dueDate.setHours(hours, minutes, 0, 0);
      } else {
        // Default to 9:00 AM if no time set
        dueDate.setHours(9, 0, 0, 0);
      }

      // Only schedule if due date is in the future
      if (dueDate <= now) continue;

      // Schedule main notification (at due time)
      const mainNotifId = await notificationService.scheduleTaskNotification(
        task.title,
        task.id,
        dueDate,
        false
      );
      if (mainNotifId) {
        notificationIds.push(mainNotifId);
      }

      // Schedule reminder notification (before due time)
      const reminderMinutes = task.reminderBefore ?? settings.defaultReminderMinutes;

      // For high priority tasks, always add reminder if not already set
      const shouldAddReminder = reminderMinutes > 0 || task.priority === 'high';
      const actualReminderMinutes = reminderMinutes > 0 ? reminderMinutes : (task.priority === 'high' ? settings.defaultReminderMinutes : 0);

      if (shouldAddReminder && actualReminderMinutes > 0) {
        const reminderDate = new Date(dueDate.getTime() - actualReminderMinutes * 60 * 1000);

        // Only schedule if reminder time is in the future
        if (reminderDate > now) {
          const reminderNotifId = await notificationService.scheduleTaskNotification(
            task.title,
            task.id,
            dueDate,
            true,
            actualReminderMinutes
          );
          if (reminderNotifId) {
            notificationIds.push(reminderNotifId);
          }
        }
      }

      if (notificationIds.length > 0) {
        newTaskIds[task.id] = notificationIds;
      }
    }

    const newScheduledIds = {
      ...scheduledIds,
      tasks: newTaskIds,
    };
    setScheduledIds(newScheduledIds);
    await saveScheduledIds(newScheduledIds);
  }, [settings, permissionStatus, scheduledIds]);

  const cancelTaskNotifications = useCallback(async (taskId: string) => {
    const taskNotifIds = scheduledIds.tasks[taskId];
    if (taskNotifIds && taskNotifIds.length > 0) {
      await notificationService.cancelNotifications(taskNotifIds);

      const newScheduledIds = { ...scheduledIds };
      delete newScheduledIds.tasks[taskId];
      setScheduledIds(newScheduledIds);
      await saveScheduledIds(newScheduledIds);
    }
  }, [scheduledIds]);

  const cancelAllNotifications = useCallback(async () => {
    await notificationService.cancelAllNotifications();
    const newScheduledIds = {
      birthdays: {},
      importantDates: {},
      tasks: {},
    };
    setScheduledIds(newScheduledIds);
    await saveScheduledIds(newScheduledIds);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        permissionStatus,
        settings,
        updateSettings,
        requestPermission,
        scheduleContactNotifications,
        scheduleTaskNotifications,
        cancelTaskNotifications,
        cancelAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

/**
 * Get the next occurrence of a date (MM-DD format)
 * If the date has already passed this year, return next year's date
 */
function getNextOccurrence(month: number, day: number, currentYear: number): Date {
  const now = new Date();
  let targetDate = new Date(currentYear, month - 1, day, 9, 0, 0, 0);

  // If the date has already passed this year, use next year
  if (targetDate <= now) {
    targetDate = new Date(currentYear + 1, month - 1, day, 9, 0, 0, 0);
  }

  return targetDate;
}
