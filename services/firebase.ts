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

// Validate config - only warn in development
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  if (import.meta.env.DEV) {
    console.error('Firebase config is missing! Check your .env file has VITE_FIREBASE_* variables.');
  }
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
  } catch (error) {
    // Only log in development
    if (import.meta.env.DEV) {
      console.warn('App Check initialization failed:', error);
    }
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
