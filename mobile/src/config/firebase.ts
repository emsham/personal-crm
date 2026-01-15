import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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

// Initialize React Native Firebase App Check
// This uses native attestation: DeviceCheck (iOS) / Play Integrity (Android)
const initializeNativeAppCheck = async () => {
  try {
    const { default: appCheck } = await import('@react-native-firebase/app-check');

    // Configure the provider based on environment
    const provider = appCheck().newReactNativeFirebaseAppCheckProvider();
    provider.configure({
      apple: {
        provider: __DEV__ ? 'debug' : 'deviceCheck',
        debugToken: process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN,
      },
      android: {
        provider: __DEV__ ? 'debug' : 'playIntegrity',
        debugToken: process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN,
      },
    });

    await appCheck().initializeAppCheck({
      provider,
      isTokenAutoRefreshEnabled: true,
    });

    console.log(`App Check initialized (${Platform.OS}, ${__DEV__ ? 'debug' : 'production'})`);
  } catch (error) {
    // App Check initialization is optional - app works without it
    // but Firestore security rules requiring App Check will fail
    console.warn('App Check initialization failed:', error);
  }
};

// Initialize App Check asynchronously
initializeNativeAppCheck();

export { auth };
export const db = getFirestore(app);
export default app;
