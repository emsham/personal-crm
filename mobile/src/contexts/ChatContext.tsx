import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { ChatSession, ChatMessage } from '../types';
import * as chatService from '../services/chatService';
import { ChatMessageData } from '../components/chat/ChatMessage';

interface ChatContextType {
  sessions: ChatSession[];
  currentSessionId: string | null;
  currentMessages: ChatMessageData[];
  isHistoryOpen: boolean;

  // Session management
  createNewSession: () => void;
  selectSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => Promise<void>;

  // Message operations
  setCurrentMessages: (messages: ChatMessageData[]) => void;
  saveCurrentSession: (messages: ChatMessageData[]) => Promise<void>;

  // UI
  toggleHistory: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessageData[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Subscribe to chat sessions
  useEffect(() => {
    if (!user) {
      setSessions([]);
      setCurrentSessionId(null);
      setCurrentMessages([]);
      return;
    }

    const unsubscribe = chatService.subscribeToChatSessions(user.uid, (newSessions) => {
      // Filter out empty sessions (no messages)
      const nonEmptySessions = newSessions.filter(s => s.messages && s.messages.length > 0);
      setSessions(nonEmptySessions);
    });

    return () => unsubscribe();
  }, [user]);

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      const session = sessions.find(s => s.id === currentSessionId);
      if (session) {
        // Convert ChatMessage to ChatMessageData
        const messages: ChatMessageData[] = session.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          toolCalls: msg.toolCalls,
          toolResults: msg.toolResults?.map(r => ({
            toolCallId: r.toolCallId,
            name: r.name,
            result: r.result,
            success: r.success,
            error: r.error,
          })),
          isStreaming: msg.isStreaming,
        }));
        setCurrentMessages(messages);
      }
    }
  }, [currentSessionId, sessions]);

  // Create a new session (clears current to start fresh)
  const createNewSession = useCallback(() => {
    setCurrentSessionId(null);
    setCurrentMessages([]);
    setIsHistoryOpen(false);
  }, []);

  // Select a session from history
  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    setIsHistoryOpen(false);
  }, []);

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) return;

    try {
      await chatService.deleteChatSession(user.uid, sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setCurrentMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete chat session:', err);
    }
  }, [user, currentSessionId]);

  // Save current session to Firestore
  const saveCurrentSession = useCallback(async (messages: ChatMessageData[]) => {
    if (!user || messages.length === 0) return;

    try {
      let sessionId = currentSessionId;

      // Create session if none exists
      if (!sessionId) {
        // Generate title from first user message
        const firstUserMessage = messages.find(m => m.role === 'user');
        const title = firstUserMessage
          ? chatService.generateSessionTitle(firstUserMessage.content)
          : 'New Chat';

        sessionId = await chatService.createChatSession(user.uid, title);
        setCurrentSessionId(sessionId);
      }

      // Convert ChatMessageData to ChatMessage for storage
      const chatMessages: ChatMessage[] = messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(),
        toolCalls: msg.toolCalls,
        toolResults: msg.toolResults?.map(r => ({
          toolCallId: r.toolCallId,
          name: r.name,
          result: r.result,
          success: r.success,
          error: r.error,
        })),
        isStreaming: msg.isStreaming,
      }));

      await chatService.updateChatSession(user.uid, sessionId, {
        messages: chatMessages,
      });
    } catch (err) {
      console.error('Failed to save chat session:', err);
    }
  }, [user, currentSessionId]);

  // Toggle history drawer
  const toggleHistory = useCallback(() => {
    setIsHistoryOpen(prev => !prev);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<ChatContextType>(() => ({
    sessions,
    currentSessionId,
    currentMessages,
    isHistoryOpen,
    createNewSession,
    selectSession,
    deleteSession,
    setCurrentMessages,
    saveCurrentSession,
    toggleHistory,
  }), [
    sessions,
    currentSessionId,
    currentMessages,
    isHistoryOpen,
    createNewSession,
    selectSession,
    deleteSession,
    saveCurrentSession,
    toggleHistory,
  ]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
