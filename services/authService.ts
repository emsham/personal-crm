import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  User,
  AuthError,
} from 'firebase/auth';
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();

// Convert Firebase error codes to user-friendly messages
const getAuthErrorMessage = (error: AuthError): string => {
  switch (error.code) {
    case 'auth/user-not-found':
      return 'No account found with this email address';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/invalid-credential':
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
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    default:
      return error.message || 'Authentication failed';
  }
};

export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    throw new Error(getAuthErrorMessage(error as AuthError));
  }
};

export const signUpWithEmail = async (email: string, password: string): Promise<User> => {
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

export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
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

export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

export const onAuthStateChanged = (callback: (user: User | null) => void): (() => void) => {
  return firebaseOnAuthStateChanged(auth, callback);
};
