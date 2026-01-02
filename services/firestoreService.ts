import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Contact, Interaction } from '../types';

// Contacts

export const subscribeToContacts = (
  userId: string,
  callback: (contacts: Contact[]) => void
): (() => void) => {
  const contactsRef = collection(db, 'users', userId, 'contacts');
  const q = query(contactsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const contacts: Contact[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Contact[];
    callback(contacts);
  });
};

export const addContact = async (
  userId: string,
  contact: Omit<Contact, 'id'>
): Promise<string> => {
  const contactsRef = collection(db, 'users', userId, 'contacts');
  const docRef = await addDoc(contactsRef, {
    ...contact,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateContact = async (
  userId: string,
  contactId: string,
  updates: Partial<Contact>
): Promise<void> => {
  const contactRef = doc(db, 'users', userId, 'contacts', contactId);
  await updateDoc(contactRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteContact = async (userId: string, contactId: string): Promise<void> => {
  const contactRef = doc(db, 'users', userId, 'contacts', contactId);
  await deleteDoc(contactRef);
};

// Interactions

export const subscribeToInteractions = (
  userId: string,
  callback: (interactions: Interaction[]) => void
): (() => void) => {
  const interactionsRef = collection(db, 'users', userId, 'interactions');
  const q = query(interactionsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const interactions: Interaction[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Interaction[];
    callback(interactions);
  });
};

export const addInteraction = async (
  userId: string,
  interaction: Omit<Interaction, 'id'>
): Promise<string> => {
  const interactionsRef = collection(db, 'users', userId, 'interactions');
  const docRef = await addDoc(interactionsRef, {
    ...interaction,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const deleteInteraction = async (userId: string, interactionId: string): Promise<void> => {
  const interactionRef = doc(db, 'users', userId, 'interactions', interactionId);
  await deleteDoc(interactionRef);
};
