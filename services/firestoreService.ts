import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Contact, Interaction, Task } from '../types';

// Contacts

export const subscribeToContacts = (
  userId: string,
  callback: (contacts: Contact[]) => void
): (() => void) => {
  const contactsRef = collection(db, 'users', userId, 'contacts');
  const q = query(contactsRef, orderBy('createdAt', 'desc'), limit(500));

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
  // Filter out undefined values - Firestore doesn't accept them
  const cleanUpdates: Record<string, any> = { updatedAt: serverTimestamp() };
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  });
  await updateDoc(contactRef, cleanUpdates);
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
  const q = query(interactionsRef, orderBy('createdAt', 'desc'), limit(1000));

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

export const updateInteraction = async (
  userId: string,
  interactionId: string,
  updates: Partial<Interaction>
): Promise<void> => {
  const interactionRef = doc(db, 'users', userId, 'interactions', interactionId);
  await updateDoc(interactionRef, updates);
};

export const deleteInteraction = async (userId: string, interactionId: string): Promise<void> => {
  const interactionRef = doc(db, 'users', userId, 'interactions', interactionId);
  await deleteDoc(interactionRef);
};

// Tasks

export const subscribeToTasks = (
  userId: string,
  callback: (tasks: Task[]) => void
): (() => void) => {
  const tasksRef = collection(db, 'users', userId, 'tasks');
  const q = query(tasksRef, orderBy('createdAt', 'desc'), limit(200));

  return onSnapshot(q, (snapshot) => {
    const tasks: Task[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Task[];
    callback(tasks);
  });
};

export const addTask = async (
  userId: string,
  task: Omit<Task, 'id'>
): Promise<string> => {
  const tasksRef = collection(db, 'users', userId, 'tasks');
  // Filter out undefined values - Firestore doesn't accept them
  const cleanTask: Record<string, any> = { createdAt: serverTimestamp() };
  Object.entries(task).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanTask[key] = value;
    }
  });
  const docRef = await addDoc(tasksRef, cleanTask);
  return docRef.id;
};

export const updateTask = async (
  userId: string,
  taskId: string,
  updates: Partial<Task>
): Promise<void> => {
  const taskRef = doc(db, 'users', userId, 'tasks', taskId);
  // Filter out undefined values - Firestore doesn't accept them
  const cleanUpdates: Record<string, any> = {};
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  });
  await updateDoc(taskRef, cleanUpdates);
};

export const deleteTask = async (userId: string, taskId: string): Promise<void> => {
  const taskRef = doc(db, 'users', userId, 'tasks', taskId);
  await deleteDoc(taskRef);
};
