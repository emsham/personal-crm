import { Platform } from 'react-native';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  sendPasswordResetEmail,
  sendEmailVerification,
  User,
  AuthError,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

// Configure Google Sign-In
GoogleSignin.configure({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

// Convert Firebase error codes to user-friendly messages
// Note: We intentionally use generic messages for credential errors to prevent user enumeration
const getAuthErrorMessage = (error: AuthError): string => {
  switch (error.code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      // Generic message prevents attackers from determining if an email exists
      return 'Invalid email or password';
    case 'auth/invalid-email':
      return 'Please enter a valid email address';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/weak-password':
      return 'Password is too weak';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection';
    case 'auth/user-disabled':
      // Generic message - don't reveal account status
      return 'Unable to sign in. Please contact support';
    default:
      return 'Authentication failed';
  }
};

export const signIn = async (email: string, password: string): Promise<User> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    throw new Error(getAuthErrorMessage(error as AuthError));
  }
};

export const signUp = async (email: string, password: string): Promise<User> => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // Send verification email
    await sendEmailVerification(result.user);
    return result.user;
  } catch (error) {
    throw new Error(getAuthErrorMessage(error as AuthError));
  }
};

export const resendVerificationEmail = async (): Promise<void> => {
  try {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    } else {
      throw new Error('No user is currently signed in');
    }
  } catch (error) {
    throw new Error(getAuthErrorMessage(error as AuthError));
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error as AuthError));
  }
};

export const signInWithGoogle = async (): Promise<User> => {
  try {
    // hasPlayServices is Android-only, skip on iOS
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices();
    }
    const response = await GoogleSignin.signIn();

    if (response.type === 'success' && response.data.idToken) {
      const credential = GoogleAuthProvider.credential(response.data.idToken);
      const result = await signInWithCredential(auth, credential);
      return result.user;
    }
    throw new Error('Google sign-in was cancelled');
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error('Sign-in cancelled');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error('Sign-in already in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Play services not available');
    }
    throw error;
  }
};

export const signOut = async (): Promise<void> => {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    // Ignore Google sign out errors
  }
  await firebaseSignOut(auth);
};

export const subscribeToAuthState = (callback: (user: User | null) => void): (() => void) => {
  return onAuthStateChanged(auth, callback);
};
