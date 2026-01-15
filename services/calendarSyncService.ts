import { Task, Contact, CalendarSettings, CalendarMapping } from '../types';
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
import {
  buildTaskEvent,
  buildBirthdayEvent,
  buildImportantDateEvent,
  buildFollowUpEvent,
} from '../shared/calendar/eventBuilders';

export type SyncAction = 'create' | 'update' | 'delete';

export interface SyncResult {
  success: boolean;
  synced: number;
  errors: string[];
}

/**
 * Syncs a task to Google Calendar
 */
export async function syncTask(
  userId: string,
  token: CalendarToken,
  task: Task,
  action: SyncAction,
  contactName?: string,
  settings?: CalendarSettings,
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<void> {
  // Check if task sync is enabled
  if (settings && !settings.syncTasks) return;

  // Skip tasks without due dates
  if (!task.dueDate && action !== 'delete') return;

  const existingMapping = await getCalendarMappingBySource(userId, 'task', task.id);

  if (action === 'delete') {
    if (existingMapping) {
      await deleteCalendarEvent(userId, token, existingMapping.googleEventId, 'primary', onTokenRefreshed);
      await deleteCalendarMapping(userId, existingMapping.id);
    }
    return;
  }

  const event = buildTaskEvent(task, contactName);
  if (!event) return;

  if (action === 'create' || !existingMapping) {
    const eventId = await createCalendarEvent(userId, token, event, 'primary', onTokenRefreshed);
    await addCalendarMapping(userId, {
      sourceType: 'task',
      sourceId: task.id,
      googleEventId: eventId,
    });
  } else {
    await updateCalendarEvent(userId, token, existingMapping.googleEventId, event, 'primary', onTokenRefreshed);
  }
}

/**
 * Syncs a contact's birthday to Google Calendar
 */
export async function syncBirthday(
  userId: string,
  token: CalendarToken,
  contact: Contact,
  action: SyncAction,
  settings?: CalendarSettings,
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<void> {
  if (settings && !settings.syncBirthdays) return;

  const existingMapping = await getCalendarMappingBySource(userId, 'birthday', contact.id);

  if (action === 'delete' || !contact.birthday) {
    if (existingMapping) {
      await deleteCalendarEvent(userId, token, existingMapping.googleEventId, 'primary', onTokenRefreshed);
      await deleteCalendarMapping(userId, existingMapping.id);
    }
    return;
  }

  const event = buildBirthdayEvent(contact);
  if (!event) return;

  if (action === 'create' || !existingMapping) {
    const eventId = await createCalendarEvent(userId, token, event, 'primary', onTokenRefreshed);
    await addCalendarMapping(userId, {
      sourceType: 'birthday',
      sourceId: contact.id,
      googleEventId: eventId,
    });
  } else {
    await updateCalendarEvent(userId, token, existingMapping.googleEventId, event, 'primary', onTokenRefreshed);
  }
}

/**
 * Syncs a contact's important date to Google Calendar
 */
export async function syncImportantDate(
  userId: string,
  token: CalendarToken,
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
      await deleteCalendarEvent(userId, token, existingMapping.googleEventId, 'primary', onTokenRefreshed);
      await deleteCalendarMapping(userId, existingMapping.id);
    }
    return;
  }

  const event = buildImportantDateEvent(contact, importantDate);

  if (action === 'create' || !existingMapping) {
    const eventId = await createCalendarEvent(userId, token, event, 'primary', onTokenRefreshed);
    await addCalendarMapping(userId, {
      sourceType: 'importantDate',
      sourceId: contact.id,
      importantDateId: importantDateId,
      googleEventId: eventId,
    });
  } else {
    await updateCalendarEvent(userId, token, existingMapping.googleEventId, event, 'primary', onTokenRefreshed);
  }
}

/**
 * Syncs a contact's follow-up reminder to Google Calendar
 */
export async function syncFollowUp(
  userId: string,
  token: CalendarToken,
  contact: Contact,
  action: SyncAction,
  settings?: CalendarSettings,
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<void> {
  if (settings && !settings.syncFollowUps) return;

  const existingMapping = await getCalendarMappingBySource(userId, 'followUp', contact.id);

  if (action === 'delete' || !contact.nextFollowUp) {
    if (existingMapping) {
      await deleteCalendarEvent(userId, token, existingMapping.googleEventId, 'primary', onTokenRefreshed);
      await deleteCalendarMapping(userId, existingMapping.id);
    }
    return;
  }

  const event = buildFollowUpEvent(contact);
  if (!event) return;

  if (action === 'create' || !existingMapping) {
    const eventId = await createCalendarEvent(userId, token, event, 'primary', onTokenRefreshed);
    await addCalendarMapping(userId, {
      sourceType: 'followUp',
      sourceId: contact.id,
      googleEventId: eventId,
    });
  } else {
    await updateCalendarEvent(userId, token, existingMapping.googleEventId, event, 'primary', onTokenRefreshed);
  }
}

/**
 * Syncs all contact-related calendar items (birthday, important dates, follow-up)
 */
export async function syncContactDates(
  userId: string,
  token: CalendarToken,
  contact: Contact,
  action: SyncAction,
  settings?: CalendarSettings,
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<void> {
  // Sync birthday
  await syncBirthday(userId, token, contact, action, settings, onTokenRefreshed);

  // Sync follow-up
  await syncFollowUp(userId, token, contact, action, settings, onTokenRefreshed);

  // Sync important dates
  if (contact.importantDates) {
    for (const date of contact.importantDates) {
      await syncImportantDate(userId, token, contact, date.id, action, settings, onTokenRefreshed);
    }
  }
}

/**
 * Cleans up all calendar events for a deleted contact
 */
export async function cleanupDeletedContact(
  userId: string,
  token: CalendarToken,
  contactId: string,
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<void> {
  const mappings = await getCalendarMappingsBySourceId(userId, contactId);

  for (const mapping of mappings) {
    try {
      await deleteCalendarEvent(userId, token, mapping.googleEventId, 'primary', onTokenRefreshed);
    } catch (error) {
      // Event may already be deleted, continue with cleanup
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

  // Create a map of contacts for quick lookup
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  // Sync all tasks
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

        await syncTask(userId, token, task, 'update', contactName, settings, onTokenRefreshed);
        result.synced++;
      } catch (error) {
        result.errors.push(`Task "${task.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // Sync all contacts (birthdays, important dates, follow-ups)
  for (const contact of contacts) {
    try {
      await syncContactDates(userId, token, contact, 'update', settings, onTokenRefreshed);
      result.synced++;
    } catch (error) {
      result.errors.push(
        `Contact "${contact.firstName} ${contact.lastName}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Update last sync time
  await updateCalendarSettings(userId, { lastSyncAt: new Date() });

  result.success = result.errors.length === 0;
  return result;
}
