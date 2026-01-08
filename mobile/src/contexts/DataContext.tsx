import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { subscribeToContacts, subscribeToTasks } from '../services/firestoreService';
import type { Contact, Task } from '../types';

interface DataContextValue {
  contacts: Contact[];
  tasks: Task[];
  isLoading: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { scheduleContactNotifications, scheduleTaskNotifications, permissionStatus } = useNotifications();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Track if initial load is complete
  const initialLoadRef = useRef({ contacts: false, tasks: false });

  // Subscribe to Firestore data
  useEffect(() => {
    if (!user) {
      setContacts([]);
      setTasks([]);
      setIsLoading(false);
      initialLoadRef.current = { contacts: false, tasks: false };
      return;
    }

    setIsLoading(true);

    const unsubContacts = subscribeToContacts(user.uid, (newContacts) => {
      setContacts(newContacts);
      initialLoadRef.current.contacts = true;
      if (initialLoadRef.current.tasks) {
        setIsLoading(false);
      }
    });

    const unsubTasks = subscribeToTasks(user.uid, (newTasks) => {
      setTasks(newTasks);
      initialLoadRef.current.tasks = true;
      if (initialLoadRef.current.contacts) {
        setIsLoading(false);
      }
    });

    return () => {
      unsubContacts();
      unsubTasks();
    };
  }, [user]);

  // Schedule notifications when data changes (debounced)
  useEffect(() => {
    if (permissionStatus !== 'granted' || isLoading) return;

    const timeoutId = setTimeout(() => {
      if (contacts.length > 0) {
        scheduleContactNotifications(contacts);
      }
      if (tasks.length > 0) {
        scheduleTaskNotifications(tasks);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [contacts, tasks, permissionStatus, isLoading, scheduleContactNotifications, scheduleTaskNotifications]);

  return (
    <DataContext.Provider value={{ contacts, tasks, isLoading }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
