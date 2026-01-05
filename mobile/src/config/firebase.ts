import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, CustomProvider } from 'firebase/app-check';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase config - use environment variables in production
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize app only if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize auth with persistence, or get existing auth
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

// Initialize App Check for mobile
// Note: For production, you need to:
// 1. Install @react-native-firebase/app-check for native attestation (DeviceCheck/Play Integrity)
// 2. Configure in Firebase Console
// For now, we set up a placeholder that can be enabled when native modules are added
const appCheckDebugToken = process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN;
if (appCheckDebugToken && __DEV__) {
  // Debug provider for development
  try {
    initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: async () => {
          return {
            token: appCheckDebugToken,
            expireTimeMillis: Date.now() + 60 * 60 * 1000, // 1 hour
          };
        },
      }),
      isTokenAutoRefreshEnabled: true,
    });
    console.log(`App Check initialized in debug mode (${Platform.OS})`);
  } catch (error) {
    console.warn('App Check debug initialization failed:', error);
  }
} else if (!__DEV__) {
  // Production: App Check requires native modules (@react-native-firebase/app-check)
  // This will be handled by the native Firebase SDK when properly configured
  console.log('App Check: Production mode - requires native configuration');
}

export { auth };
export const db = getFirestore(app);
export default app;
