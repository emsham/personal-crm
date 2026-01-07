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
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ChatSession, ChatMessage } from '../types';

// Convert Firestore timestamp to Date
function convertTimestamp(timestamp: Timestamp | Date | string): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
}

// Convert Firestore document to ChatSession
function docToChatSession(id: string, data: Record<string, unknown>): ChatSession {
  return {
    id,
    title: (data.title as string) || 'New Chat',
    messages: ((data.messages as Array<Record<string, unknown>>) || []).map((msg) => ({
      ...msg,
      timestamp: convertTimestamp(msg.timestamp as Timestamp | Date | string),
    })) as ChatMessage[],
    createdAt: convertTimestamp((data.createdAt as Timestamp | Date | string) || new Date()),
    updatedAt: convertTimestamp((data.updatedAt as Timestamp | Date | string) || new Date()),
  };
}

// Subscribe to chat sessions
export const subscribeToChatSessions = (
  userId: string,
  callback: (sessions: ChatSession[]) => void
): (() => void) => {
  const sessionsRef = collection(db, 'users', userId, 'chatSessions');
  const q = query(sessionsRef, orderBy('updatedAt', 'desc'), limit(50));

  return onSnapshot(q, (snapshot) => {
    const sessions: ChatSession[] = snapshot.docs.map((doc) =>
      docToChatSession(doc.id, doc.data())
    );
    callback(sessions);
  });
};

// Create a new chat session
export const createChatSession = async (
  userId: string,
  title?: string
): Promise<string> => {
  const sessionsRef = collection(db, 'users', userId, 'chatSessions');
  const docRef = await addDoc(sessionsRef, {
    title: title || 'New Chat',
    messages: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

// Recursively remove undefined values from objects/arrays (Firestore doesn't accept undefined)
function removeUndefined(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = removeUndefined(value);
      }
    }
    return result;
  }

  return obj;
}

// Update chat session
export const updateChatSession = async (
  userId: string,
  sessionId: string,
  updates: Partial<Pick<ChatSession, 'title' | 'messages'>>
): Promise<void> => {
  const sessionRef = doc(db, 'users', userId, 'chatSessions', sessionId);

  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.title !== undefined) {
    updateData.title = updates.title;
  }

  if (updates.messages !== undefined) {
    // Convert Date objects to ISO strings and remove undefined values for Firestore
    const cleanedMessages = updates.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
      toolCalls: msg.toolCalls,
      toolResults: msg.toolResults,
      isStreaming: msg.isStreaming,
    }));
    // Recursively remove all undefined values from nested objects
    updateData.messages = removeUndefined(cleanedMessages);
  }

  await updateDoc(sessionRef, updateData);
};

// Delete chat session
export const deleteChatSession = async (
  userId: string,
  sessionId: string
): Promise<void> => {
  const sessionRef = doc(db, 'users', userId, 'chatSessions', sessionId);
  await deleteDoc(sessionRef);
};

// Generate a title from the first message
export function generateSessionTitle(firstMessage: string): string {
  // Truncate and clean up
  const cleaned = firstMessage
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);

  return cleaned.length < firstMessage.length ? `${cleaned}...` : cleaned;
}
