import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCalendar } from '../contexts/CalendarContext';
import { Task, Contact } from '../types';
import {
  syncTask,
  syncContactDates,
  cleanupDeletedContact,
  SyncAction,
} from '../services/calendarSyncService';

interface UseCalendarSyncOptions {
  tasks: Task[];
  contacts: Contact[];
  debounceMs?: number;
}

/**
 * Hook that automatically syncs tasks and contacts to Google Calendar
 * when they change. Uses debouncing to prevent rapid API calls.
 */
export function useCalendarSync({ tasks, contacts, debounceMs = 500 }: UseCalendarSyncOptions) {
  const { user } = useAuth();
  const { isConnected, token, settings } = useCalendar();

  // Track previous values to detect changes
  const prevTasksRef = useRef<Map<string, Task>>(new Map());
  const prevContactsRef = useRef<Map<string, Contact>>(new Map());
  const pendingSyncsRef = useRef<Map<string, { type: 'task' | 'contact'; action: SyncAction }>>(new Map());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create contact map for quick lookup
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  const processPendingSyncs = useCallback(async () => {
    if (!user || !token || !settings || !isConnected) return;

    const syncs = new Map(pendingSyncsRef.current);
    pendingSyncsRef.current.clear();

    for (const [id, sync] of syncs) {
      try {
        if (sync.type === 'task') {
          const task = tasks.find((t) => t.id === id);
          if (task || sync.action === 'delete') {
            const contactName = task?.contactId
              ? (() => {
                  const c = contactMap.get(task.contactId);
                  return c ? `${c.firstName} ${c.lastName}` : undefined;
                })()
              : undefined;

            await syncTask(
              user.uid,
              token,
              task || ({ id } as Task),
              sync.action,
              contactName,
              settings
            );
          }
        } else if (sync.type === 'contact') {
          const contact = contacts.find((c) => c.id === id);
          if (sync.action === 'delete') {
            await cleanupDeletedContact(user.uid, token, id);
          } else if (contact) {
            await syncContactDates(user.uid, token, contact, sync.action, settings);
          }
        }
      } catch (error) {
        console.error(`Failed to sync ${sync.type} ${id}:`, error);
      }
    }
  }, [user, token, settings, isConnected, tasks, contacts, contactMap]);

  const queueSync = useCallback(
    (id: string, type: 'task' | 'contact', action: SyncAction) => {
      pendingSyncsRef.current.set(id, { type, action });

      // Debounce the sync
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(processPendingSyncs, debounceMs);
    },
    [processPendingSyncs, debounceMs]
  );

  // Detect task changes
  useEffect(() => {
    if (!isConnected) return;

    const currentTasks = new Map(tasks.map((t) => [t.id, t]));
    const prevTasks = prevTasksRef.current;

    // Check for new and updated tasks
    for (const [id, task] of currentTasks) {
      const prevTask = prevTasks.get(id);
      if (!prevTask) {
        // New task
        queueSync(id, 'task', 'create');
      } else if (
        prevTask.title !== task.title ||
        prevTask.dueDate !== task.dueDate ||
        prevTask.dueTime !== task.dueTime ||
        prevTask.description !== task.description ||
        prevTask.completed !== task.completed ||
        prevTask.contactId !== task.contactId
      ) {
        // Updated task
        queueSync(id, 'task', 'update');
      }
    }

    // Check for deleted tasks
    for (const id of prevTasks.keys()) {
      if (!currentTasks.has(id)) {
        queueSync(id, 'task', 'delete');
      }
    }

    prevTasksRef.current = currentTasks;
  }, [tasks, isConnected, queueSync]);

  // Detect contact changes (for birthday, important dates, follow-up)
  useEffect(() => {
    if (!isConnected) return;

    const currentContacts = new Map(contacts.map((c) => [c.id, c]));
    const prevContacts = prevContactsRef.current;

    // Check for new and updated contacts
    for (const [id, contact] of currentContacts) {
      const prevContact = prevContacts.get(id);
      if (!prevContact) {
        // New contact
        queueSync(id, 'contact', 'create');
      } else if (
        prevContact.birthday !== contact.birthday ||
        prevContact.nextFollowUp !== contact.nextFollowUp ||
        JSON.stringify(prevContact.importantDates) !== JSON.stringify(contact.importantDates) ||
        prevContact.firstName !== contact.firstName ||
        prevContact.lastName !== contact.lastName
      ) {
        // Updated contact
        queueSync(id, 'contact', 'update');
      }
    }

    // Check for deleted contacts
    for (const id of prevContacts.keys()) {
      if (!currentContacts.has(id)) {
        queueSync(id, 'contact', 'delete');
      }
    }

    prevContactsRef.current = currentContacts;
  }, [contacts, isConnected, queueSync]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
}
