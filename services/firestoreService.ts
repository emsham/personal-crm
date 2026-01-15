import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Contact, Interaction, Task, CalendarMapping, CalendarSettings, CalendarEventSourceType } from '../types';

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

// Calendar Mappings

export const subscribeToCalendarMappings = (
  userId: string,
  callback: (mappings: CalendarMapping[]) => void
): (() => void) => {
  const mappingsRef = collection(db, 'users', userId, 'calendarMappings');

  return onSnapshot(mappingsRef, (snapshot) => {
    const mappings: CalendarMapping[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as CalendarMapping[];
    callback(mappings);
  });
};

export const addCalendarMapping = async (
  userId: string,
  mapping: Omit<CalendarMapping, 'id' | 'createdAt'>
): Promise<string> => {
  const mappingsRef = collection(db, 'users', userId, 'calendarMappings');
  const docRef = await addDoc(mappingsRef, {
    ...mapping,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getCalendarMappingBySource = async (
  userId: string,
  sourceType: CalendarEventSourceType,
  sourceId: string,
  importantDateId?: string
): Promise<CalendarMapping | null> => {
  const mappingsRef = collection(db, 'users', userId, 'calendarMappings');
  let q = query(
    mappingsRef,
    where('sourceType', '==', sourceType),
    where('sourceId', '==', sourceId)
  );

  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    // For importantDates, also check importantDateId
    if (sourceType === 'importantDate') {
      if (data.importantDateId === importantDateId) {
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as CalendarMapping;
      }
    } else {
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as CalendarMapping;
    }
  }

  return null;
};

export const getCalendarMappingsBySourceId = async (
  userId: string,
  sourceId: string
): Promise<CalendarMapping[]> => {
  const mappingsRef = collection(db, 'users', userId, 'calendarMappings');
  const q = query(mappingsRef, where('sourceId', '==', sourceId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
  })) as CalendarMapping[];
};

export const deleteCalendarMapping = async (
  userId: string,
  mappingId: string
): Promise<void> => {
  const mappingRef = doc(db, 'users', userId, 'calendarMappings', mappingId);
  await deleteDoc(mappingRef);
};

export const deleteAllCalendarMappings = async (userId: string): Promise<void> => {
  const mappingsRef = collection(db, 'users', userId, 'calendarMappings');
  const snapshot = await getDocs(mappingsRef);
  await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
};

// Calendar Settings

const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  connected: false,
  syncTasks: true,
  syncBirthdays: true,
  syncImportantDates: true,
  syncFollowUps: true,
};

export const getCalendarSettings = async (userId: string): Promise<CalendarSettings> => {
  const settingsRef = doc(db, 'users', userId, 'settings', 'calendar');
  const docSnap = await getDoc(settingsRef);

  if (!docSnap.exists()) {
    return DEFAULT_CALENDAR_SETTINGS;
  }

  const data = docSnap.data();
  return {
    connected: data.connected ?? false,
    syncTasks: data.syncTasks ?? true,
    syncBirthdays: data.syncBirthdays ?? true,
    syncImportantDates: data.syncImportantDates ?? true,
    syncFollowUps: data.syncFollowUps ?? true,
    lastSyncAt: data.lastSyncAt?.toDate(),
  };
};

export const updateCalendarSettings = async (
  userId: string,
  updates: Partial<CalendarSettings>
): Promise<void> => {
  const settingsRef = doc(db, 'users', userId, 'settings', 'calendar');
  const cleanUpdates: Record<string, unknown> = {};

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      if (key === 'lastSyncAt' && value instanceof Date) {
        cleanUpdates[key] = Timestamp.fromDate(value);
      } else {
        cleanUpdates[key] = value;
      }
    }
  });

  await setDoc(settingsRef, cleanUpdates, { merge: true });
};

export const subscribeToCalendarSettings = (
  userId: string,
  callback: (settings: CalendarSettings) => void
): (() => void) => {
  const settingsRef = doc(db, 'users', userId, 'settings', 'calendar');

  return onSnapshot(settingsRef, (docSnap) => {
    if (!docSnap.exists()) {
      callback(DEFAULT_CALENDAR_SETTINGS);
      return;
    }

    const data = docSnap.data();
    callback({
      connected: data.connected ?? false,
      syncTasks: data.syncTasks ?? true,
      syncBirthdays: data.syncBirthdays ?? true,
      syncImportantDates: data.syncImportantDates ?? true,
      syncFollowUps: data.syncFollowUps ?? true,
      lastSyncAt: data.lastSyncAt?.toDate(),
    });
  });
};
