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
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
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
function docToChatSession(id: string, data: any): ChatSession {
  return {
    id,
    title: data.title || 'New Chat',
    messages: (data.messages || []).map((msg: any) => ({
      ...msg,
      timestamp: convertTimestamp(msg.timestamp),
    })),
    createdAt: convertTimestamp(data.createdAt || new Date()),
    updatedAt: convertTimestamp(data.updatedAt || new Date()),
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

// Update chat session
export const updateChatSession = async (
  userId: string,
  sessionId: string,
  updates: Partial<Pick<ChatSession, 'title' | 'messages'>>
): Promise<void> => {
  const sessionRef = doc(db, 'users', userId, 'chatSessions', sessionId);

  const updateData: any = {
    updatedAt: serverTimestamp(),
  };

  if (updates.title !== undefined) {
    updateData.title = updates.title;
  }

  if (updates.messages !== undefined) {
    // Convert Date objects to ISO strings for Firestore
    updateData.messages = updates.messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
    }));
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
