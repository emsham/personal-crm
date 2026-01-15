import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { saveApiKey, deleteApiKey } from './apiKeyService';

const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

// Get client IDs from environment
const WEB_CLIENT_ID = Constants.expoConfig?.extra?.GOOGLE_WEB_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// Web app URL for OAuth
const WEB_APP_URL = Constants.expoConfig?.extra?.WEB_APP_URL ||
  process.env.EXPO_PUBLIC_WEB_APP_URL ||
  'https://tethru.com';

export interface CalendarToken {
  access_token: string;
  refresh_token: string;
  expiry: number; // Unix timestamp in milliseconds
}

// Cache key for calendar token in SecureStore
const CALENDAR_TOKEN_CACHE_KEY = 'nexus_calendar_token';

/**
 * Opens the web app's OAuth flow in a browser
 * The web app handles the OAuth exchange and saves tokens to Firestore
 * Mobile app picks up the tokens via Firestore subscription
 */
export async function initiateCalendarAuth(userId: string): Promise<void> {
  if (!WEB_CLIENT_ID) {
    throw new Error('Google Calendar Client ID not configured.');
  }

  // Create state with mobile flag
  const stateObj = {
    nonce: Math.random().toString(36).substring(2, 15),
    mobile: true,
  };
  const state = btoa(JSON.stringify(stateObj));

  // Build the Google OAuth URL that redirects to web app's callback
  const redirectUri = `${WEB_APP_URL}/auth/calendar/callback`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', WEB_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', GOOGLE_CALENDAR_SCOPE);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  // Open browser for OAuth
  const result = await WebBrowser.openBrowserAsync(authUrl.toString());

  // Browser was dismissed - tokens should be saved to Firestore by web app
  // The CalendarContext will pick them up via subscription
  return;
}

/**
 * Saves calendar token to Firestore (encrypted) and local cache
 */
export async function saveCalendarToken(
  userId: string,
  token: CalendarToken,
  encryptionKey: string
): Promise<void> {
  // Save to Firestore (encrypted)
  await saveApiKey(userId, 'googleCalendar', JSON.stringify(token), encryptionKey);

  // Also cache locally for fast access
  await SecureStore.setItemAsync(CALENDAR_TOKEN_CACHE_KEY, JSON.stringify(token));
}

/**
 * Loads cached calendar token from SecureStore
 */
export async function loadCachedCalendarToken(): Promise<CalendarToken | null> {
  try {
    const cached = await SecureStore.getItemAsync(CALENDAR_TOKEN_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as CalendarToken;
    }
  } catch (error) {
    console.error('Failed to load cached calendar token:', error);
  }
  return null;
}

/**
 * Clears cached calendar token
 */
export async function clearCachedCalendarToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CALENDAR_TOKEN_CACHE_KEY);
  } catch (error) {
    console.error('Failed to clear cached calendar token:', error);
  }
}

/**
 * Parses a stored calendar token string
 */
export function parseCalendarToken(tokenString: string): CalendarToken | null {
  try {
    return JSON.parse(tokenString) as CalendarToken;
  } catch {
    return null;
  }
}

/**
 * Checks if a token is expired (with 5 min buffer)
 */
export function isTokenExpired(token: CalendarToken): boolean {
  return Date.now() >= token.expiry - 5 * 60 * 1000;
}

/**
 * Refreshes an expired access token using the refresh token
 */
export async function refreshCalendarToken(
  userId: string,
  token: CalendarToken,
  encryptionKey: string
): Promise<CalendarToken> {
  if (!token.refresh_token) {
    throw new Error('No refresh token available');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: WEB_CLIENT_ID || '',
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to refresh token');
  }

  const refreshedTokens = await response.json();

  const newToken: CalendarToken = {
    access_token: refreshedTokens.access_token,
    refresh_token: token.refresh_token, // Keep original refresh token
    expiry: Date.now() + refreshedTokens.expires_in * 1000,
  };

  await saveCalendarToken(userId, newToken, encryptionKey);
  return newToken;
}

/**
 * Revokes calendar access and deletes stored token
 */
export async function disconnectCalendar(
  userId: string,
  token: CalendarToken
): Promise<void> {
  // Revoke the token with Google
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${token.access_token}`, {
      method: 'POST',
    });
  } catch (error) {
    console.warn('Token revocation failed:', error);
  }

  // Delete from Firestore
  await deleteApiKey(userId, 'googleCalendar');

  // Clear local cache
  await clearCachedCalendarToken();
}

/**
 * Gets a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(
  userId: string,
  token: CalendarToken,
  encryptionKey: string,
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<string> {
  if (isTokenExpired(token)) {
    const newToken = await refreshCalendarToken(userId, token, encryptionKey);
    onTokenRefreshed?.(newToken);
    return newToken.access_token;
  }
  return token.access_token;
}
