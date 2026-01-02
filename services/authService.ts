import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const signUpWithEmail = async (email: string, password: string): Promise<User> => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

export const onAuthStateChanged = (callback: (user: User | null) => void): (() => void) => {
  return firebaseOnAuthStateChanged(auth, callback);
};
