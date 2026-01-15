import type { Task, Contact, CalendarSettings, ImportantDate, GoogleCalendarEvent } from '../types';
import { CalendarToken } from './calendarAuthService';
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from './googleCalendarService';
import {
  addCalendarMapping,
  getCalendarMappingBySource,
  getCalendarMappingsBySourceId,
  deleteCalendarMapping,
  updateCalendarSettings,
} from './firestoreService';

export type SyncAction = 'create' | 'update' | 'delete';

export interface SyncResult {
  success: boolean;
  synced: number;
  errors: string[];
}

// Event builder helpers
function nextDay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

function addHour(dateTimeStr: string): string {
  const date = new Date(dateTimeStr);
  date.setHours(date.getHours() + 1);
  return date.toISOString().slice(0, 19);
}

function buildTaskEvent(task: Task, contactName?: string): GoogleCalendarEvent | null {
  if (!task.dueDate) return null;

  const summary = contactName
    ? `[Tethru] ${task.title} - ${contactName}`
    : `[Tethru] ${task.title}`;

  const hasTime = !!task.dueTime;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (hasTime) {
    const startDateTime = `${task.dueDate}T${task.dueTime}:00`;
    const endDateTime = addHour(startDateTime);

    return {
      summary,
      description: task.description || 'Task from Tethru CRM',
      start: { dateTime: startDateTime, timeZone },
      end: { dateTime: endDateTime, timeZone },
      reminders: task.reminderBefore
        ? { useDefault: false, overrides: [{ method: 'popup', minutes: task.reminderBefore }] }
        : { useDefault: true },
    };
  }

  return {
    summary,
    description: task.description || 'Task from Tethru CRM',
    start: { date: task.dueDate },
    end: { date: nextDay(task.dueDate) },
    reminders: { useDefault: true },
  };
}

function buildBirthdayEvent(contact: Contact): GoogleCalendarEvent | null {
  if (!contact.birthday) return null;

  const [month, day] = contact.birthday.split('-');
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-${month}-${day}`;

  return {
    summary: `${contact.firstName} ${contact.lastName}'s Birthday`,
    description: 'Birthday reminder from Tethru CRM',
    start: { date: startDate },
    end: { date: nextDay(startDate) },
    recurrence: ['RRULE:FREQ=YEARLY'],
  };
}

function buildImportantDateEvent(contact: Contact, importantDate: ImportantDate): GoogleCalendarEvent {
  const [month, day] = importantDate.date.split('-');
  const year = importantDate.year || new Date().getFullYear();
  const startDate = `${year}-${month}-${day}`;

  const event: GoogleCalendarEvent = {
    summary: `${importantDate.label} - ${contact.firstName} ${contact.lastName}`,
    description: 'Important date from Tethru CRM',
    start: { date: startDate },
    end: { date: nextDay(startDate) },
  };

  if (!importantDate.year) {
    event.recurrence = ['RRULE:FREQ=YEARLY'];
  }

  return event;
}

function buildFollowUpEvent(contact: Contact): GoogleCalendarEvent | null {
  if (!contact.nextFollowUp) return null;

  return {
    summary: `Follow up with ${contact.firstName} ${contact.lastName}`,
    description: 'Follow-up reminder from Tethru CRM',
    start: { date: contact.nextFollowUp },
    end: { date: nextDay(contact.nextFollowUp) },
  };
}

/**
 * Syncs a task to Google Calendar
 */
export async function syncTask(
  userId: string,
  token: CalendarToken,
  encryptionKey: string,
  task: Task,
  action: SyncAction,
  contactName?: string,
  settings?: CalendarSettings,
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<void> {
  if (settings && !settings.syncTasks) return;
  if (!task.dueDate && action !== 'delete') return;

  const existingMapping = await getCalendarMappingBySource(userId, 'task', task.id);

  if (action === 'delete') {
    if (existingMapping) {
      await deleteCalendarEvent(userId, token, encryptionKey, existingMapping.googleEventId, 'primary', onTokenRefreshed);
      await deleteCalendarMapping(userId, existingMapping.id);
    }
    return;
  }

  const event = buildTaskEvent(task, contactName);
  if (!event) return;

  if (action === 'create' || !existingMapping) {
    const eventId = await createCalendarEvent(userId, token, encryptionKey, event, 'primary', onTokenRefreshed);
    await addCalendarMapping(userId, {
      sourceType: 'task',
      sourceId: task.id,
      googleEventId: eventId,
    });
  } else {
    await updateCalendarEvent(userId, token, encryptionKey, existingMapping.googleEventId, event, 'primary', onTokenRefreshed);
  }
}

/**
 * Syncs a contact's birthday to Google Calendar
 */
export async function syncBirthday(
  userId: string,
  token: CalendarToken,
  encryptionKey: string,
  contact: Contact,
  action: SyncAction,
  settings?: CalendarSettings,
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<void> {
  if (settings && !settings.syncBirthdays) return;

  const existingMapping = await getCalendarMappingBySource(userId, 'birthday', contact.id);

  if (action === 'delete' || !contact.birthday) {
    if (existingMapping) {
      await deleteCalendarEvent(userId, token, encryptionKey, existingMapping.googleEventId, 'primary', onTokenRefreshed);
      await deleteCalendarMapping(userId, existingMapping.id);
    }
    return;
  }

  const event = buildBirthdayEvent(contact);
  if (!event) return;

  if (action === 'create' || !existingMapping) {
    const eventId = await createCalendarEvent(userId, token, encryptionKey, event, 'primary', onTokenRefreshed);
    await addCalendarMapping(userId, {
      sourceType: 'birthday',
      sourceId: contact.id,
      googleEventId: eventId,
    });
  } else {
    await updateCalendarEvent(userId, token, encryptionKey, existingMapping.googleEventId, event, 'primary', onTokenRefreshed);
  }
}

/**
 * Syncs a contact's important date to Google Calendar
 */
export async function syncImportantDate(
  userId: string,
  token: CalendarToken,
  encryptionKey: string,
  contact: Contact,
  importantDateId: string,
  action: SyncAction,
  settings?: CalendarSettings,
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<void> {
  if (settings && !settings.syncImportantDates) return;

  const importantDate = contact.importantDates?.find((d) => d.id === importantDateId);
  const existingMapping = await getCalendarMappingBySource(userId, 'importantDate', contact.id, importantDateId);

  if (action === 'delete' || !importantDate) {
    if (existingMapping) {
      await deleteCalendarEvent(userId, token, encryptionKey, existingMapping.googleEventId, 'primary', onTokenRefreshed);
      await deleteCalendarMapping(userId, existingMapping.id);
    }
    return;
  }

  const event = buildImportantDateEvent(contact, importantDate);

  if (action === 'create' || !existingMapping) {
    const eventId = await createCalendarEvent(userId, token, encryptionKey, event, 'primary', onTokenRefreshed);
    await addCalendarMapping(userId, {
      sourceType: 'importantDate',
      sourceId: contact.id,
      importantDateId,
      googleEventId: eventId,
    });
  } else {
    await updateCalendarEvent(userId, token, encryptionKey, existingMapping.googleEventId, event, 'primary', onTokenRefreshed);
  }
}

/**
 * Syncs a contact's follow-up reminder to Google Calendar
 */
export async function syncFollowUp(
  userId: string,
  token: CalendarToken,
  encryptionKey: string,
  contact: Contact,
  action: SyncAction,
  settings?: CalendarSettings,
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<void> {
  if (settings && !settings.syncFollowUps) return;

  const existingMapping = await getCalendarMappingBySource(userId, 'followUp', contact.id);

  if (action === 'delete' || !contact.nextFollowUp) {
    if (existingMapping) {
      await deleteCalendarEvent(userId, token, encryptionKey, existingMapping.googleEventId, 'primary', onTokenRefreshed);
      await deleteCalendarMapping(userId, existingMapping.id);
    }
    return;
  }

  const event = buildFollowUpEvent(contact);
  if (!event) return;

  if (action === 'create' || !existingMapping) {
    const eventId = await createCalendarEvent(userId, token, encryptionKey, event, 'primary', onTokenRefreshed);
    await addCalendarMapping(userId, {
      sourceType: 'followUp',
      sourceId: contact.id,
      googleEventId: eventId,
    });
  } else {
    await updateCalendarEvent(userId, token, encryptionKey, existingMapping.googleEventId, event, 'primary', onTokenRefreshed);
  }
}

/**
 * Syncs all contact-related calendar items
 */
export async function syncContactDates(
  userId: string,
  token: CalendarToken,
  encryptionKey: string,
  contact: Contact,
  action: SyncAction,
  settings?: CalendarSettings,
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<void> {
  await syncBirthday(userId, token, encryptionKey, contact, action, settings, onTokenRefreshed);
  await syncFollowUp(userId, token, encryptionKey, contact, action, settings, onTokenRefreshed);

  if (contact.importantDates) {
    for (const date of contact.importantDates) {
      await syncImportantDate(userId, token, encryptionKey, contact, date.id, action, settings, onTokenRefreshed);
    }
  }
}

/**
 * Cleans up all calendar events for a deleted contact
 */
export async function cleanupDeletedContact(
  userId: string,
  token: CalendarToken,
  encryptionKey: string,
  contactId: string,
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<void> {
  const mappings = await getCalendarMappingsBySourceId(userId, contactId);

  for (const mapping of mappings) {
    try {
      await deleteCalendarEvent(userId, token, encryptionKey, mapping.googleEventId, 'primary', onTokenRefreshed);
    } catch (error) {
      console.warn(`Failed to delete calendar event ${mapping.googleEventId}:`, error);
    }
    await deleteCalendarMapping(userId, mapping.id);
  }
}

/**
 * Performs a full sync of all tasks and contacts to Google Calendar
 */
export async function fullSync(
  userId: string,
  token: CalendarToken,
  encryptionKey: string,
  tasks: Task[],
  contacts: Contact[],
  settings: CalendarSettings,
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    errors: [],
  };

  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  // Sync tasks
  if (settings.syncTasks) {
    for (const task of tasks) {
      if (!task.dueDate || task.completed) continue;

      try {
        const contactName = task.contactId
          ? (() => {
              const c = contactMap.get(task.contactId);
              return c ? `${c.firstName} ${c.lastName}` : undefined;
            })()
          : undefined;

        await syncTask(userId, token, encryptionKey, task, 'update', contactName, settings, onTokenRefreshed);
        result.synced++;
      } catch (error) {
        result.errors.push(`Task "${task.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // Sync contacts
  for (const contact of contacts) {
    try {
      await syncContactDates(userId, token, encryptionKey, contact, 'update', settings, onTokenRefreshed);
      result.synced++;
    } catch (error) {
      result.errors.push(
        `Contact "${contact.firstName} ${contact.lastName}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  await updateCalendarSettings(userId, { lastSyncAt: new Date() });
  result.success = result.errors.length === 0;
  return result;
}
