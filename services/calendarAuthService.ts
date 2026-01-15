import { auth } from './firebase';
import { saveApiKey, deleteApiKey } from './apiKeyService';
import { deriveEncryptionKey } from '../shared/crypto';

const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_CALENDAR_REDIRECT_URI || `${window.location.origin}/auth/calendar/callback`;

export interface CalendarToken {
  access_token: string;
  refresh_token: string;
  expiry: number; // Unix timestamp in milliseconds
}

/**
 * Initiates the Google OAuth flow for calendar access
 * Opens a popup window for user to grant calendar permissions
 * @param mobile - If true, adds mobile=true to state for redirect back to app
 */
export async function initiateCalendarAuth(mobile = false): Promise<void> {
  if (!CLIENT_ID) {
    throw new Error('Google Calendar Client ID not configured. Please set VITE_GOOGLE_CALENDAR_CLIENT_ID.');
  }

  const stateObj = {
    nonce: crypto.randomUUID(),
    mobile,
  };
  const state = btoa(JSON.stringify(stateObj));
  sessionStorage.setItem('calendar_auth_state', state);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', GOOGLE_CALENDAR_SCOPE);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  // Pre-fill email if user is signed in with Google
  if (auth.currentUser?.email) {
    authUrl.searchParams.set('login_hint', auth.currentUser.email);
  }

  // For mobile, redirect in same window (they'll come from mobile browser)
  if (mobile) {
    window.location.href = authUrl.toString();
    return;
  }

  // Open in popup window for web
  const width = 500;
  const height = 600;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  window.open(
    authUrl.toString(),
    'Google Calendar Authorization',
    `width=${width},height=${height},left=${left},top=${top},popup=1`
  );
}

/**
 * Parses the state parameter to extract mobile flag
 */
export function parseState(state: string): { nonce: string; mobile: boolean } | null {
  try {
    return JSON.parse(atob(state));
  } catch {
    // Legacy state format (plain UUID)
    return { nonce: state, mobile: false };
  }
}

/**
 * Handles the OAuth callback after user grants permissions
 * Exchanges authorization code for tokens and saves them encrypted
 * Returns whether this was a mobile request
 */
export async function handleAuthCallback(code: string, state: string): Promise<boolean> {
  const savedState = sessionStorage.getItem('calendar_auth_state');

  // For mobile flows, state won't be in sessionStorage since it's a different browser context
  // We still validate the state format but skip the CSRF check for mobile
  const parsedState = parseState(state);
  const isMobile = parsedState?.mobile ?? false;

  if (!isMobile && state !== savedState) {
    throw new Error('Invalid state parameter - possible CSRF attack');
  }
  sessionStorage.removeItem('calendar_auth_state');

  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Exchange code for tokens
  // Note: In production, this should be done via a backend/serverless function
  // to keep the client_secret secure. For now, we use implicit flow workaround.
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_SECRET || '',
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.json();
    throw new Error(error.error_description || 'Failed to exchange authorization code');
  }

  const tokens = await tokenResponse.json();

  const calendarToken: CalendarToken = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry: Date.now() + tokens.expires_in * 1000,
  };

  await saveCalendarToken(user.uid, calendarToken);
  return isMobile;
}

/**
 * Saves encrypted calendar token to Firestore
 */
export async function saveCalendarToken(userId: string, token: CalendarToken): Promise<void> {
  const encryptionKey = deriveEncryptionKey(userId, userId, false);
  await saveApiKey(userId, 'googleCalendar', JSON.stringify(token), encryptionKey);
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
  return Date.now() >= token.expiry - 5 * 60 * 1000; // 5 minute buffer
}

/**
 * Refreshes an expired access token using the refresh token
 */
export async function refreshCalendarToken(userId: string, token: CalendarToken): Promise<CalendarToken> {
  if (!token.refresh_token) {
    throw new Error('No refresh token available');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_SECRET || '',
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }),
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

  await saveCalendarToken(userId, newToken);
  return newToken;
}

/**
 * Revokes calendar access and deletes stored token
 */
export async function disconnectCalendar(userId: string, token: CalendarToken): Promise<void> {
  // Revoke the token with Google
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${token.access_token}`, {
      method: 'POST',
    });
  } catch (error) {
    // Continue even if revocation fails - user may have already revoked via Google
    console.warn('Token revocation failed:', error);
  }

  // Delete from Firestore
  await deleteApiKey(userId, 'googleCalendar');
}

/**
 * Gets a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(
  userId: string,
  token: CalendarToken,
  onTokenRefreshed?: (newToken: CalendarToken) => void
): Promise<string> {
  if (isTokenExpired(token)) {
    const newToken = await refreshCalendarToken(userId, token);
    onTokenRefreshed?.(newToken);
    return newToken.access_token;
  }
  return token.access_token;
}
