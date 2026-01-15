import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationTrigger {
  date?: Date;
  seconds?: number;
  repeats?: boolean;
  channelId?: string;
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  trigger: NotificationTrigger;
}

/**
 * Request notification permissions from the user
 */
export async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    if (__DEV__) console.log('Notifications require a physical device');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (__DEV__) console.log('Notification permissions not granted');
    return false;
  }

  // Setup Android notification channel
  if (Platform.OS === 'android') {
    await setupAndroidChannels();
  }

  return true;
}

/**
 * Check if notifications are enabled
 */
export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Setup notification categories with actions (for iOS actionable notifications)
 */
export async function setupNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync('task_actions', [
    {
      identifier: 'mark_complete',
      buttonTitle: '✓ Mark Complete',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}

/**
 * Setup Android notification channels
 */
async function setupAndroidChannels(): Promise<void> {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3b82f6',
  });

  await Notifications.setNotificationChannelAsync('birthdays', {
    name: 'Birthdays & Important Dates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#ec4899',
  });

  await Notifications.setNotificationChannelAsync('tasks', {
    name: 'Task Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3b82f6',
  });
}

/**
 * Schedule a notification
 */
export async function scheduleNotification(
  title: string,
  body: string,
  trigger: NotificationTrigger,
  data?: Record<string, unknown>
): Promise<string> {
  let notificationTrigger: Notifications.NotificationTriggerInput;

  if (trigger.date) {
    notificationTrigger = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger.date,
      channelId: trigger.channelId,
    };
  } else {
    notificationTrigger = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: trigger.seconds || 1,
      channelId: trigger.channelId,
    };
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: notificationTrigger,
  });

  return id;
}

/**
 * Schedule a notification for a specific date/time
 */
export async function scheduleNotificationAtDate(
  title: string,
  body: string,
  date: Date,
  channelId?: string,
  data?: Record<string, unknown>,
  categoryIdentifier?: string
): Promise<string> {
  // Don't schedule if date is in the past
  if (date.getTime() <= Date.now()) {
    if (__DEV__) console.log('Cannot schedule notification for past date');
    return '';
  }

  const trigger: Notifications.NotificationTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date,
    channelId,
  };

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
      categoryIdentifier,
    },
    trigger,
  });

  return id;
}

/**
 * Cancel a specific notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel multiple notifications
 */
export async function cancelNotifications(notificationIds: string[]): Promise<void> {
  await Promise.all(notificationIds.map((id) => cancelNotification(id)));
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear badge
 */
export async function clearBadge(): Promise<void> {
  await setBadgeCount(0);
}

/**
 * Add listener for notification received while app is foregrounded
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add listener for notification response (user tapped notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Remove a notification listener
 */
export function removeNotificationListener(subscription: Notifications.Subscription): void {
  subscription.remove();
}

// Helper functions for scheduling specific notification types

/**
 * Schedule a birthday notification
 */
export async function scheduleBirthdayNotification(
  contactName: string,
  birthdayDate: Date,
  contactId: string
): Promise<string> {
  // Set time to 9:00 AM
  const notifyDate = new Date(birthdayDate);
  notifyDate.setHours(9, 0, 0, 0);

  return scheduleNotificationAtDate(
    '🎂 Birthday Today',
    `${contactName}'s birthday is today!`,
    notifyDate,
    'birthdays',
    { type: 'birthday', contactId }
  );
}

/**
 * Schedule an important date notification
 */
export async function scheduleImportantDateNotification(
  contactName: string,
  dateLabel: string,
  date: Date,
  contactId: string,
  dateId: string
): Promise<string> {
  // Set time to 9:00 AM
  const notifyDate = new Date(date);
  notifyDate.setHours(9, 0, 0, 0);

  return scheduleNotificationAtDate(
    `⭐ ${dateLabel} Today`,
    `${contactName}'s ${dateLabel} is today!`,
    notifyDate,
    'birthdays',
    { type: 'important_date', contactId, dateId }
  );
}

/**
 * Schedule a task notification with actionable "Mark Complete" button
 */
export async function scheduleTaskNotification(
  taskTitle: string,
  taskId: string,
  dueDate: Date,
  isReminder: boolean = false,
  minutesBefore: number = 0
): Promise<string> {
  const notifyDate = new Date(dueDate);

  if (isReminder && minutesBefore > 0) {
    notifyDate.setMinutes(notifyDate.getMinutes() - minutesBefore);
  }

  const title = isReminder
    ? `⏰ Task Due in ${formatMinutes(minutesBefore)}`
    : '📋 Task Due Now';

  return scheduleNotificationAtDate(
    title,
    taskTitle,
    notifyDate,
    'tasks',
    { type: 'task', taskId, isReminder },
    'task_actions' // This enables the "Mark Complete" action button
  );
}

/**
 * Format minutes into a readable string
 */
function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return `${hours}h ${remainingMins}m`;
}
