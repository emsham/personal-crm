import { Task, Contact, ImportantDate, GoogleCalendarEvent } from '../../types';

/**
 * Adds one hour to a datetime string
 */
function addHour(dateTimeStr: string): string {
  const date = new Date(dateTimeStr);
  date.setHours(date.getHours() + 1);
  return date.toISOString().slice(0, 19);
}

/**
 * Gets the next day in YYYY-MM-DD format (needed for all-day events)
 */
function nextDay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

/**
 * Builds a Google Calendar event from a CRM task
 */
export function buildTaskEvent(
  task: Task,
  contactName?: string
): GoogleCalendarEvent | null {
  if (!task.dueDate) return null;

  const summary = contactName
    ? `[Tethru] ${task.title} - ${contactName}`
    : `[Tethru] ${task.title}`;

  const hasTime = !!task.dueTime;

  if (hasTime) {
    const startDateTime = `${task.dueDate}T${task.dueTime}:00`;
    const endDateTime = addHour(startDateTime);

    return {
      summary,
      description: task.description || `Task from Tethru CRM`,
      start: { dateTime: startDateTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      end: { dateTime: endDateTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      reminders: task.reminderBefore
        ? {
            useDefault: false,
            overrides: [{ method: 'popup', minutes: task.reminderBefore }],
          }
        : { useDefault: true },
    };
  }

  // All-day event
  return {
    summary,
    description: task.description || `Task from Tethru CRM`,
    start: { date: task.dueDate },
    end: { date: nextDay(task.dueDate) },
    reminders: { useDefault: true },
  };
}

/**
 * Builds a recurring yearly Google Calendar event for a contact's birthday
 */
export function buildBirthdayEvent(contact: Contact): GoogleCalendarEvent | null {
  if (!contact.birthday) return null;

  const [month, day] = contact.birthday.split('-');
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-${month}-${day}`;

  return {
    summary: `${contact.firstName} ${contact.lastName}'s Birthday`,
    description: `Birthday reminder from Tethru CRM`,
    start: { date: startDate },
    end: { date: nextDay(startDate) },
    recurrence: ['RRULE:FREQ=YEARLY'],
  };
}

/**
 * Builds a Google Calendar event for an important date
 * Creates recurring event if no year specified, one-time event otherwise
 */
export function buildImportantDateEvent(
  contact: Contact,
  importantDate: ImportantDate
): GoogleCalendarEvent {
  const [month, day] = importantDate.date.split('-');
  const year = importantDate.year || new Date().getFullYear();
  const startDate = `${year}-${month}-${day}`;

  const event: GoogleCalendarEvent = {
    summary: `${importantDate.label} - ${contact.firstName} ${contact.lastName}`,
    description: `Important date from Tethru CRM`,
    start: { date: startDate },
    end: { date: nextDay(startDate) },
  };

  // Only add recurrence if no specific year (recurring date)
  if (!importantDate.year) {
    event.recurrence = ['RRULE:FREQ=YEARLY'];
  }

  return event;
}

/**
 * Builds a Google Calendar event for a follow-up reminder
 */
export function buildFollowUpEvent(contact: Contact): GoogleCalendarEvent | null {
  if (!contact.nextFollowUp) return null;

  return {
    summary: `Follow up with ${contact.firstName} ${contact.lastName}`,
    description: `Follow-up reminder from Tethru CRM`,
    start: { date: contact.nextFollowUp },
    end: { date: nextDay(contact.nextFollowUp) },
  };
}
