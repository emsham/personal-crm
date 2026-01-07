import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

  // Local streaming content state to avoid Firestore flicker
  const [streamingContent, setStreamingContent] = useState<{
    sessionId: string;
    messages: ChatMessage[];
  } | null>(null);

  // Ref to track streaming state for subscription callback (avoids dependency issues)
  const isStreamingRef = useRef(false);
  const streamingSessionIdRef = useRef<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Get current session - merge streaming content if active
  const currentSession = useMemo(() => {
    const session = sessions.find(s => s.id === currentSessionId) || null;

    // If we have streaming content for this session, use it instead
    if (streamingContent && streamingContent.sessionId === currentSessionId && session) {
      return {
        ...session,
        messages: streamingContent.messages,
      };
    }

    return session;
  }, [sessions, currentSessionId, streamingContent]);

  // Subscribe to chat sessions
  useEffect(() => {
    if (!user) {
      setSessions([]);
      setCurrentSessionId(null);
      return;
    }

    const unsubscribe = chatService.subscribeToChatSessions(user.uid, (newSessions) => {
      // Filter out empty sessions (no messages)
      const nonEmptySessions = newSessions.filter(s => s.messages && s.messages.length > 0);

      // If we're actively streaming to a session, skip updating that session
      // to prevent flicker from Firestore updates conflicting with local state
      if (isStreamingRef.current && streamingSessionIdRef.current) {
        const streamingId = streamingSessionIdRef.current;
        setSessions(prevSessions => {
          return nonEmptySessions.map(s => {
            if (s.id === streamingId) {
              // Keep existing session data during streaming
              const existingSession = prevSessions.find(ps => ps.id === streamingId);
              return existingSession || s;
            }
            return s;
          });
        });
      } else {
        setSessions(nonEmptySessions);
      }
      // Don't auto-select a session - let user start fresh with orb
    });

    return () => unsubscribe();
  }, [user]);

  // Create a new session (just clears current - actual session created on first message)
  const createNewSession = useCallback(async () => {
    // Just clear the current session to show the orb/hero state
    // The actual session will be created when the first message is sent
    setCurrentSessionId(null);
    setError(null);
  }, []);

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

    setIsLoading(true);
    setIsStreaming(true);
    setError(null);

    // Set refs to prevent Firestore subscription from updating this session while streaming
    isStreamingRef.current = true;
    streamingSessionIdRef.current = sessionId;

    // Show user message immediately via streaming content (prevents flash)
    setStreamingContent({ sessionId, messages: updatedMessages });

    // Save to Firestore in background (won't cause flash since we blocked subscription)
    chatService.updateChatSession(user.uid, sessionId, {
      messages: updatedMessages,
      title,
    });

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

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

      // Throttle UI updates to reduce re-renders (update at most every 30ms)
      // But show first chunk immediately for responsiveness
      let lastUpdateTime = 0;
      let pendingUpdate = false;
      let isFirstChunk = true;
      const UPDATE_INTERVAL = 30;

      const flushStreamingUpdate = () => {
        const streamingMessages = [
          ...updatedMessages,
          { ...assistantMessage, content: currentContent },
        ];
        setStreamingContent({ sessionId, messages: streamingMessages });
        lastUpdateTime = Date.now();
        pendingUpdate = false;
      };

      // Show user message + empty assistant message immediately (shows "thinking" state)
      setStreamingContent({
        sessionId,
        messages: [...updatedMessages, assistantMessage]
      });

      // Stream the response
      const stream = llmService.stream({
        messages: updatedMessages,
        tools: CRM_TOOLS,
        systemPrompt,
      });

      for await (const chunk of stream) {
        // Check if aborted (user navigated away)
        if (abortSignal.aborted) {
          console.log('Streaming aborted by user');
          break;
        }
        if (chunk.type === 'text' && chunk.content) {
          currentContent += chunk.content;

          // Show first chunk immediately, then throttle subsequent updates
          if (isFirstChunk) {
            flushStreamingUpdate();
            isFirstChunk = false;
          } else {
            const now = Date.now();
            if (now - lastUpdateTime >= UPDATE_INTERVAL) {
              flushStreamingUpdate();
            } else {
              pendingUpdate = true;
            }
          }
        } else if (chunk.type === 'tool_call' && chunk.toolCall) {
          toolCalls.push(chunk.toolCall);
        } else if (chunk.type === 'error') {
          throw new Error(chunk.error);
        } else if (chunk.type === 'done') {
          break;
        }
      }

      // Flush any pending content
      if (pendingUpdate) {
        flushStreamingUpdate();
      }

      // Process tool calls if any
      if (toolCalls.length > 0) {
        console.log('Processing tool calls:', toolCalls.map(tc => tc.name));
        console.log('CRM data available:', { contacts: crmData.contacts.length, interactions: crmData.interactions.length, tasks: crmData.tasks.length });
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

        // Handle follow-up responses with potential additional tool calls
        let currentMessages = [...updatedMessages, assistantWithTools, toolResultsMessage];
        let maxIterations = 5; // Prevent infinite loops
        let iteration = 0;

        while (iteration < maxIterations) {
          // Check if aborted before starting new iteration
          if (abortSignal.aborted) {
            console.log('Tool call loop aborted by user');
            break;
          }

          iteration++;
          let followUpContent = '';
          const followUpToolCalls: ToolCall[] = [];
          const followUpMessageId = `msg_${Date.now()}_final_${iteration}`;

          console.log(`Starting follow-up iteration ${iteration} with`, currentMessages.length, 'messages');

          try {
            const followUpStream = llmService.stream({
              messages: currentMessages,
              tools: CRM_TOOLS,
              systemPrompt,
            });

            // Throttle follow-up updates too
            let followUpLastUpdate = 0;
            let followUpPending = false;
            let isFirstFollowUpChunk = true;

            const flushFollowUpUpdate = () => {
              const streamingFollowUp: ChatMessage = {
                id: followUpMessageId,
                role: 'assistant',
                content: followUpContent,
                timestamp: new Date(),
                isStreaming: true,
              };
              const newMessages = [...currentMessages, streamingFollowUp];
              setStreamingContent({ sessionId, messages: newMessages });
              followUpLastUpdate = Date.now();
              followUpPending = false;
            };

            // Show thinking state immediately
            setStreamingContent({
              sessionId,
              messages: [...currentMessages, {
                id: followUpMessageId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                isStreaming: true,
              }]
            });

            for await (const chunk of followUpStream) {
              // Check if aborted (user navigated away)
              if (abortSignal.aborted) {
                console.log('Follow-up streaming aborted by user');
                break;
              }
              if (chunk.type === 'text' && chunk.content) {
                followUpContent += chunk.content;

                // Show first chunk immediately, then throttle
                if (isFirstFollowUpChunk) {
                  flushFollowUpUpdate();
                  isFirstFollowUpChunk = false;
                } else {
                  const now = Date.now();
                  if (now - followUpLastUpdate >= UPDATE_INTERVAL) {
                    flushFollowUpUpdate();
                  } else {
                    followUpPending = true;
                  }
                }
              } else if (chunk.type === 'tool_call' && chunk.toolCall) {
                console.log('Follow-up tool call:', chunk.toolCall.name);
                followUpToolCalls.push(chunk.toolCall);
              } else if (chunk.type === 'error') {
                console.error('Follow-up error:', chunk.error);
                break;
              } else if (chunk.type === 'done') {
                break;
              }
            }

            // Flush pending follow-up content
            if (followUpPending) {
              flushFollowUpUpdate();
            }
          } catch (followUpError) {
            console.error('Follow-up stream error:', followUpError);
            break;
          }

          // If there are follow-up tool calls, execute them and continue the loop
          if (followUpToolCalls.length > 0) {
            console.log('Executing follow-up tool calls:', followUpToolCalls.map(tc => tc.name));
            const followUpToolResults: ToolResult[] = [];

            for (const toolCall of followUpToolCalls) {
              console.log('Executing follow-up tool:', toolCall.name, 'with args:', toolCall.arguments);
              const result = await executeToolCall(toolCall.name, toolCall.arguments, {
                userId: user.uid,
                data: crmData,
              });
              result.toolCallId = toolCall.id;
              followUpToolResults.push(result);
              console.log('Follow-up tool result:', result.success ? 'success' : 'failed', result);
            }

            // Add assistant message with tool calls
            const followUpAssistant: ChatMessage = {
              id: `msg_${Date.now()}_assistant_${iteration}`,
              role: 'assistant',
              content: followUpContent,
              timestamp: new Date(),
              toolCalls: followUpToolCalls,
              isStreaming: false,
            };

            // Add tool results message
            const followUpToolResultsMessage: ChatMessage = {
              id: `msg_${Date.now()}_tools_${iteration}`,
              role: 'tool',
              content: '',
              timestamp: new Date(),
              toolResults: followUpToolResults,
            };

            currentMessages = [...currentMessages, followUpAssistant, followUpToolResultsMessage];

            // Save intermediate state
            await chatService.updateChatSession(user.uid, sessionId, {
              messages: currentMessages,
            });
          } else {
            // No more tool calls, add final content and break
            if (followUpContent) {
              const finalAssistantMessage: ChatMessage = {
                id: followUpMessageId, // Reuse the same ID to prevent re-animation
                role: 'assistant',
                content: followUpContent,
                timestamp: new Date(),
                isStreaming: false,
              };
              currentMessages.push(finalAssistantMessage);
            }
            break;
          }
        }

        // Final save
        await chatService.updateChatSession(user.uid, sessionId, {
          messages: currentMessages,
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
      // Clear streaming refs first so Firestore subscription can update
      isStreamingRef.current = false;
      streamingSessionIdRef.current = null;
      // Delay clearing streaming content to let Firestore subscription sync
      // This prevents a flash where content disappears momentarily
      setTimeout(() => {
        setStreamingContent(null);
      }, 250);
    }
  }, [user, currentSessionId, sessions, settings.provider, currentProviderConfigured, getActiveApiKey, crmData]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    isStreamingRef.current = false;
    streamingSessionIdRef.current = null;
    setStreamingContent(null);
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
