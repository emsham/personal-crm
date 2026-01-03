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
      // Filter out empty sessions (no messages)
      const nonEmptySessions = newSessions.filter(s => s.messages && s.messages.length > 0);
      setSessions(nonEmptySessions);
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
          iteration++;
          let followUpContent = '';
          const followUpToolCalls: ToolCall[] = [];

          console.log(`Starting follow-up iteration ${iteration} with`, currentMessages.length, 'messages');

          try {
            const followUpStream = llmService.stream({
              messages: currentMessages,
              tools: CRM_TOOLS,
              systemPrompt,
            });

            for await (const chunk of followUpStream) {
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
                  messages: [...currentMessages, streamingFollowUp],
                });
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
                id: `msg_${Date.now()}_final`,
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
