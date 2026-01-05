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
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Contact, Interaction, Task } from '../types';

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
  const cleanUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };
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

export const updateInteraction = async (
  userId: string,
  interactionId: string,
  updates: Partial<Interaction>
): Promise<void> => {
  const interactionRef = doc(db, 'users', userId, 'interactions', interactionId);
  const cleanUpdates: Record<string, unknown> = {};
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  });
  await updateDoc(interactionRef, cleanUpdates);
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
  const q = query(tasksRef, orderBy('createdAt', 'desc'));

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
  const cleanTask: Record<string, unknown> = { createdAt: serverTimestamp() };
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
  const cleanUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };
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
