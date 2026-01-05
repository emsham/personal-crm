import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Debug: log config (remove in production)
console.log('Firebase config loaded:', {
  apiKey: firebaseConfig.apiKey ? '***' : 'MISSING',
  authDomain: firebaseConfig.authDomain || 'MISSING',
  projectId: firebaseConfig.projectId || 'MISSING',
});

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase config is missing! Check your .env file has VITE_FIREBASE_* variables.');
}

const app = initializeApp(firebaseConfig);

// Initialize App Check with reCAPTCHA Enterprise
// Note: You must configure the reCAPTCHA Enterprise site key in Firebase Console
// and add the site key to your environment variables
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
if (recaptchaSiteKey) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
    console.log('App Check initialized with reCAPTCHA Enterprise');
  } catch (error) {
    console.warn('App Check initialization failed:', error);
  }
} else if (import.meta.env.DEV) {
  // In development, App Check can be bypassed using debug tokens
  // Set FIREBASE_APPCHECK_DEBUG_TOKEN=true in browser console for local development
  console.log('App Check: No reCAPTCHA site key provided (development mode)');
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
