import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ChatSession, ChatMessage, ToolCall, ToolResult, Contact, Interaction, Task } from '../types';
import { useLLMSettings } from './LLMSettingsContext';
import { useAuth } from './AuthContext';
import { createLLMService, LLMStreamChunk } from '../services/llmService';
import { CRM_TOOLS } from '../utils/toolDefinitions';
import { executeToolCall, CRMData } from '../utils/toolExecutors';
import { buildSystemPrompt } from '../utils/systemPrompt';
import * as chatService from '../services/chatService';

// Import services to register them
import '../services/geminiService';
import '../services/openaiService';

interface ChatContextType {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  sidebarOpen: boolean;

  // CRM data for tools
  setCRMData: (data: CRMData) => void;

  // Session management
  createNewSession: () => Promise<void>;
  selectSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => Promise<void>;

  // Chat operations
  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;
  clearError: () => void;

  // UI
  toggleSidebar: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { settings, currentProviderConfigured, getActiveApiKey } = useLLMSettings();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [crmData, setCRMData] = useState<CRMData>({ contacts: [], interactions: [], tasks: [] });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Get current session
  const currentSession = sessions.find(s => s.id === currentSessionId) || null;

  // Subscribe to chat sessions
  useEffect(() => {
    if (!user) {
      setSessions([]);
      setCurrentSessionId(null);
      return;
    }

    const unsubscribe = chatService.subscribeToChatSessions(user.uid, (newSessions) => {
      setSessions(newSessions);
      // If no current session and we have sessions, select the most recent
      if (!currentSessionId && newSessions.length > 0) {
        setCurrentSessionId(newSessions[0].id);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Create a new session
  const createNewSession = useCallback(async () => {
    if (!user) return;

    try {
      const sessionId = await chatService.createChatSession(user.uid);
      setCurrentSessionId(sessionId);
    } catch (err) {
      setError('Failed to create new chat session');
      console.error(err);
    }
  }, [user]);

  // Select a session
  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    setError(null);
  }, []);

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) return;

    try {
      await chatService.deleteChatSession(user.uid, sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(sessions.find(s => s.id !== sessionId)?.id || null);
      }
    } catch (err) {
      setError('Failed to delete chat session');
      console.error(err);
    }
  }, [user, currentSessionId, sessions]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!user || !content.trim()) return;

    // Check if configured
    if (!currentProviderConfigured) {
      setError('Please configure your API key in settings to use the AI assistant.');
      return;
    }

    const apiKey = getActiveApiKey();
    if (!apiKey) {
      setError('API key not found. Please configure it in settings.');
      return;
    }

    // Create or get session
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await chatService.createChatSession(user.uid);
      setCurrentSessionId(sessionId);
    }

    const session = sessions.find(s => s.id === sessionId);
    const messages = session?.messages || [];

    // Create user message
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Add user message to session
    const updatedMessages = [...messages, userMessage];

    // Update title if first message
    const isFirstMessage = messages.length === 0;
    const title = isFirstMessage
      ? chatService.generateSessionTitle(content)
      : session?.title || 'New Chat';

    // Save immediately
    await chatService.updateChatSession(user.uid, sessionId, {
      messages: updatedMessages,
      title,
    });

    setIsLoading(true);
    setIsStreaming(true);
    setError(null);

    try {
      // Create LLM service
      const llmService = createLLMService(settings.provider, apiKey);
      if (!llmService) {
        throw new Error(`LLM provider "${settings.provider}" is not available`);
      }

      // Build system prompt with CRM context
      const systemPrompt = buildSystemPrompt(crmData);

      // Create streaming assistant message
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      let currentContent = '';
      const toolCalls: ToolCall[] = [];

      // Stream the response
      const stream = llmService.stream({
        messages: updatedMessages,
        tools: CRM_TOOLS,
        systemPrompt,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'text' && chunk.content) {
          currentContent += chunk.content;
          // Update the session with streamed content
          const streamingMessages = [
            ...updatedMessages,
            { ...assistantMessage, content: currentContent },
          ];
          await chatService.updateChatSession(user.uid, sessionId, {
            messages: streamingMessages,
          });
        } else if (chunk.type === 'tool_call' && chunk.toolCall) {
          toolCalls.push(chunk.toolCall);
        } else if (chunk.type === 'error') {
          throw new Error(chunk.error);
        } else if (chunk.type === 'done') {
          break;
        }
      }

      // Process tool calls if any
      if (toolCalls.length > 0) {
        console.log('Processing tool calls:', toolCalls.map(tc => tc.name));
        const toolResults: ToolResult[] = [];

        for (const toolCall of toolCalls) {
          console.log('Executing tool:', toolCall.name, 'with args:', toolCall.arguments);
          const result = await executeToolCall(toolCall.name, toolCall.arguments, {
            userId: user.uid,
            data: crmData,
          });
          result.toolCallId = toolCall.id;
          toolResults.push(result);
          console.log('Tool result:', result.success ? 'success' : 'failed', result);
        }

        // Add assistant message with tool calls
        const assistantWithTools: ChatMessage = {
          ...assistantMessage,
          content: currentContent,
          toolCalls,
          isStreaming: false,
        };

        // Add tool results message
        const toolResultsMessage: ChatMessage = {
          id: `msg_${Date.now()}_tools`,
          role: 'tool',
          content: '',
          timestamp: new Date(),
          toolResults,
        };

        // Save intermediate state with tool results visible
        await chatService.updateChatSession(user.uid, sessionId, {
          messages: [...updatedMessages, assistantWithTools, toolResultsMessage],
        });

        // Get follow-up response from LLM with tool results
        const followUpMessages = [
          ...updatedMessages,
          assistantWithTools,
          toolResultsMessage,
        ];

        let followUpContent = '';
        console.log('Starting follow-up stream with', followUpMessages.length, 'messages');
        try {
          const followUpStream = llmService.stream({
            messages: followUpMessages,
            tools: CRM_TOOLS,
            systemPrompt,
          });

          for await (const chunk of followUpStream) {
            console.log('Follow-up chunk:', chunk.type, chunk.content?.substring(0, 50) || chunk.error || '');
            if (chunk.type === 'text' && chunk.content) {
              followUpContent += chunk.content;
              // Update with streaming follow-up
              const streamingFollowUp: ChatMessage = {
                id: `msg_${Date.now()}_final`,
                role: 'assistant',
                content: followUpContent,
                timestamp: new Date(),
                isStreaming: true,
              };
              await chatService.updateChatSession(user.uid, sessionId, {
                messages: [...updatedMessages, assistantWithTools, toolResultsMessage, streamingFollowUp],
              });
            } else if (chunk.type === 'tool_call' && chunk.toolCall) {
              // AI wants to call another tool - handle it
              console.log('Follow-up wants another tool call:', chunk.toolCall.name);
            } else if (chunk.type === 'error') {
              console.error('Follow-up error:', chunk.error);
              break;
            } else if (chunk.type === 'done') {
              console.log('Follow-up done, content length:', followUpContent.length);
              break;
            }
          }
        } catch (followUpError) {
          console.error('Follow-up stream error:', followUpError);
        }

        // Final save - always include tool results
        const finalMessages = [...updatedMessages, assistantWithTools, toolResultsMessage];

        if (followUpContent) {
          const finalAssistantMessage: ChatMessage = {
            id: `msg_${Date.now()}_final`,
            role: 'assistant',
            content: followUpContent,
            timestamp: new Date(),
            isStreaming: false,
          };
          finalMessages.push(finalAssistantMessage);
        }

        await chatService.updateChatSession(user.uid, sessionId, {
          messages: finalMessages,
        });
      } else {
        // No tool calls, just save the final message
        const finalMessages = [
          ...updatedMessages,
          { ...assistantMessage, content: currentContent, isStreaming: false },
        ];

        await chatService.updateChatSession(user.uid, sessionId, {
          messages: finalMessages,
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: `I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      };

      await chatService.updateChatSession(user.uid, sessionId, {
        messages: [...updatedMessages, errorMessage],
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [user, currentSessionId, sessions, settings.provider, currentProviderConfigured, getActiveApiKey, crmData]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const value: ChatContextType = {
    sessions,
    currentSession,
    isLoading,
    isStreaming,
    error,
    sidebarOpen,
    setCRMData,
    createNewSession,
    selectSession,
    deleteSession,
    sendMessage,
    stopStreaming,
    clearError,
    toggleSidebar,
  };

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
