import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Contact, Interaction, Task } from '../types';
import {
  subscribeToContacts,
  subscribeToInteractions,
  subscribeToTasks,
} from '../services/firestoreService';

interface FirestoreData {
  contacts: Contact[];
  interactions: Interaction[];
  tasks: Task[];
  loading: boolean;
}

export const useFirestoreData = (user: User | null): FirestoreData => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setContacts([]);
      setInteractions([]);
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribeContacts = subscribeToContacts(user.uid, (contactsData) => {
      setContacts(contactsData);
      setLoading(false);
    });

    const unsubscribeInteractions = subscribeToInteractions(user.uid, (interactionsData) => {
      setInteractions(interactionsData);
    });

    const unsubscribeTasks = subscribeToTasks(user.uid, (tasksData) => {
      setTasks(tasksData);
    });

    return () => {
      unsubscribeContacts();
      unsubscribeInteractions();
      unsubscribeTasks();
    };
  }, [user]);

  return { contacts, interactions, tasks, loading };
};
