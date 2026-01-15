import type { GoogleCalendarEvent } from '../types';
import {
  CalendarToken,
  getValidAccessToken,
  refreshCalendarToken,
} from './calendarAuthService';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const DEFAULT_CALENDAR_ID = 'primary';

interface CalendarApiError {
  error: {
    code: number;
    message: string;
  };
}

/**
 * Makes an authenticated request to the Google Calendar API
 */
async function calendarApiRequest<T>(
  userId: string,
  token: CalendarToken,
  encryptionKey: string,
  endpoint: string,
  options: RequestInit = {},
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<T> {
  const accessToken = await getValidAccessToken(userId, token, encryptionKey, onTokenRefreshed);

  const response = await fetch(`${CALENDAR_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Handle token expiration during request
  if (response.status === 401) {
    const newToken = await refreshCalendarToken(userId, token, encryptionKey);
    onTokenRefreshed?.(newToken);

    // Retry with new token
    const retryResponse = await fetch(`${CALENDAR_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${newToken.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!retryResponse.ok) {
      const error: CalendarApiError = await retryResponse.json();
      throw new Error(error.error?.message || 'Calendar API request failed');
    }

    return retryResponse.json();
  }

  if (!response.ok) {
    const error: CalendarApiError = await response.json();
    throw new Error(error.error?.message || 'Calendar API request failed');
  }

  // Handle 204 No Content (delete operations)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * Creates a new event on the user's Google Calendar
 */
export async function createCalendarEvent(
  userId: string,
  token: CalendarToken,
  encryptionKey: string,
  event: GoogleCalendarEvent,
  calendarId: string = DEFAULT_CALENDAR_ID,
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<string> {
  const result = await calendarApiRequest<{ id: string }>(
    userId,
    token,
    encryptionKey,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      body: JSON.stringify(event),
    },
    onTokenRefreshed
  );

  return result.id;
}

/**
 * Updates an existing event on the user's Google Calendar
 */
export async function updateCalendarEvent(
  userId: string,
  token: CalendarToken,
  encryptionKey: string,
  eventId: string,
  event: GoogleCalendarEvent,
  calendarId: string = DEFAULT_CALENDAR_ID,
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<void> {
  await calendarApiRequest(
    userId,
    token,
    encryptionKey,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(event),
    },
    onTokenRefreshed
  );
}

/**
 * Deletes an event from the user's Google Calendar
 */
export async function deleteCalendarEvent(
  userId: string,
  token: CalendarToken,
  encryptionKey: string,
  eventId: string,
  calendarId: string = DEFAULT_CALENDAR_ID,
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<void> {
  await calendarApiRequest(
    userId,
    token,
    encryptionKey,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
    },
    onTokenRefreshed
  );
}
