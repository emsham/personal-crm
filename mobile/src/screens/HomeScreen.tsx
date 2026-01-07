import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useLLMSettings } from '../contexts/LLMSettingsContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useChat } from '../contexts/ChatContext';
import {
  subscribeToContacts,
  subscribeToTasks,
  subscribeToInteractions,
} from '../services/firestoreService';
import {
  streamOpenAI,
  streamGemini,
  buildCRMSystemPrompt,
  getSuggestions,
  ChatMessage as ServiceChatMessage,
} from '../services/aiService';
import { executeToolCall, CRMData, ToolResult } from '../services/toolExecutors';
import { ToolCall } from '../shared/ai/types';
import { ChatMessage, ChatMessageData, ChatInput, ChatHistoryModal } from '../components/chat';
import { LLMSettingsModal } from '../components/LLMSettingsModal';
import type { Contact, Task, Interaction } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

const MAX_TOOL_ITERATIONS = 5;

export const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const { settings, currentProviderConfigured } = useLLMSettings();
  const { scheduleContactNotifications, scheduleTaskNotifications, permissionStatus } = useNotifications();
  const {
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
  } = useChat();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingTextRef = useRef<string>('');
  const streamingUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Data state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);

  // Chat state - use context for messages
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sync local messages with context
  useEffect(() => {
    if (currentMessages.length > 0) {
      setMessages(currentMessages);
    } else if (!currentSessionId) {
      setMessages([]);
    }
  }, [currentMessages, currentSessionId]);

  // Subscribe to data only when screen is focused
  useEffect(() => {
    if (!user || !isFocused) return;

    const unsubContacts = subscribeToContacts(user.uid, setContacts);
    const unsubTasks = subscribeToTasks(user.uid, setTasks);
    const unsubInteractions = subscribeToInteractions(user.uid, setInteractions);

    return () => {
      unsubContacts();
      unsubTasks();
      unsubInteractions();
    };
  }, [user, isFocused]);

  // Cleanup streaming timeout on unmount
  useEffect(() => {
    return () => {
      if (streamingUpdateTimeoutRef.current) {
        clearTimeout(streamingUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Schedule notifications when contacts change
  useEffect(() => {
    if (contacts.length > 0 && permissionStatus === 'granted') {
      scheduleContactNotifications(contacts);
    }
  }, [contacts, permissionStatus, scheduleContactNotifications]);

  // Schedule notifications when tasks change
  useEffect(() => {
    if (tasks.length > 0 && permissionStatus === 'granted') {
      scheduleTaskNotifications(tasks);
    }
  }, [tasks, permissionStatus, scheduleTaskNotifications]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  const processToolCalls = useCallback(
    async (
      toolCalls: ToolCall[],
      currentMessages: ChatMessageData[],
      iteration: number
    ): Promise<void> => {
      if (!user || iteration >= MAX_TOOL_ITERATIONS) return;

      const crmData: CRMData = { contacts, interactions, tasks };

      // Execute tool calls
      const results: ToolResult[] = [];
      for (const toolCall of toolCalls) {
        const result = await executeToolCall(toolCall, {
          userId: user.uid,
          data: crmData,
        });
        results.push(result);
      }

      // Add tool results message
      const toolMessage: ChatMessageData = {
        id: `msg_${Date.now()}_tool`,
        role: 'tool',
        content: '',
        toolResults: results,
      };

      const messagesWithTools = [...currentMessages, toolMessage];
      setMessages(messagesWithTools);

      // Continue conversation with tool results
      const apiKey =
        settings.provider === 'gemini' ? settings.geminiApiKey : settings.openaiApiKey;
      if (!apiKey) return;

      const systemPrompt = buildCRMSystemPrompt(contacts, tasks);

      // Convert to service format
      const serviceMessages: ServiceChatMessage[] = messagesWithTools.map((m) => ({
        role: m.role,
        content: m.content,
        toolCalls: m.toolCalls,
        toolResults: m.toolResults?.map((r) => ({
          toolCallId: r.toolCallId,
          name: r.name,
          result: r.result,
        })),
      }));

      // Stream next response
      let responseContent = '';
      const newToolCalls: ToolCall[] = [];

      const assistantMessage: ChatMessageData = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: '',
        isStreaming: true,
      };

      const messagesWithAssistant = [...messagesWithTools, assistantMessage];
      setMessages(messagesWithAssistant);

      const streamFn = settings.provider === 'openai' ? streamOpenAI : streamGemini;

      await streamFn(
        apiKey,
        serviceMessages,
        systemPrompt,
        {
          onText: (text) => {
            responseContent += text;
            setMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.content = responseContent;
              }
              return [...updated];
            });
          },
          onToolCall: (toolCall) => {
            newToolCalls.push(toolCall);
          },
          onDone: async () => {
            const finalMessages = messagesWithAssistant.map((m, i) =>
              i === messagesWithAssistant.length - 1
                ? { ...m, content: responseContent, toolCalls: newToolCalls.length > 0 ? newToolCalls : undefined, isStreaming: false }
                : m
            );

            setMessages(finalMessages);

            // Process any new tool calls
            if (newToolCalls.length > 0) {
              await processToolCalls(newToolCalls, finalMessages, iteration + 1);
            } else {
              // No more tool calls, save the session
              await saveCurrentSession(finalMessages);
            }
          },
          onError: (error) => {
            setMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.content = `Error: ${error}`;
                lastMsg.isStreaming = false;
              }
              return [...updated];
            });
          },
        },
        abortControllerRef.current?.signal
      );
    },
    [user, contacts, tasks, interactions, settings, saveCurrentSession]
  );

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading || isStreaming || !currentProviderConfigured) return;

    const apiKey =
      settings.provider === 'gemini' ? settings.geminiApiKey : settings.openaiApiKey;
    if (!apiKey) return;

    // Create abort controller
    abortControllerRef.current = new AbortController();

    // Add user message
    const userMessage: ChatMessageData = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: inputValue.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);
    setIsStreaming(true);

    const systemPrompt = buildCRMSystemPrompt(contacts, tasks);

    // Convert to service format
    const serviceMessages: ServiceChatMessage[] = updatedMessages.map((m) => ({
      role: m.role,
      content: m.content,
      toolCalls: m.toolCalls,
      toolResults: m.toolResults?.map((r) => ({
        toolCallId: r.toolCallId,
        name: r.name,
        result: r.result,
      })),
    }));

    // Create assistant message placeholder
    const assistantMessage: ChatMessageData = {
      id: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    setMessages([...updatedMessages, assistantMessage]);

    let responseContent = '';
    const toolCalls: ToolCall[] = [];

    const streamFn = settings.provider === 'openai' ? streamOpenAI : streamGemini;

    try {
      await streamFn(
        apiKey,
        serviceMessages,
        systemPrompt,
        {
          onText: (text) => {
            responseContent += text;
            setMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.content = responseContent;
              }
              return [...updated];
            });
          },
          onToolCall: (toolCall) => {
            toolCalls.push(toolCall);
          },
          onDone: async () => {
            const finalMessages = [...updatedMessages, {
              ...assistantMessage,
              content: responseContent,
              toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
              isStreaming: false,
            }];

            setMessages(finalMessages);

            // Process tool calls if any
            if (toolCalls.length > 0) {
              await processToolCalls(toolCalls, finalMessages, 0);
            } else {
              // No tool calls, save session now
              await saveCurrentSession(finalMessages);
            }

            setIsStreaming(false);
            setIsLoading(false);
          },
          onError: (error) => {
            setMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.content = `Error: ${error}`;
                lastMsg.isStreaming = false;
              }
              return [...updated];
            });
            setIsStreaming(false);
            setIsLoading(false);
          },
        },
        abortControllerRef.current?.signal
      );
    } catch (error) {
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, [
    inputValue,
    messages,
    isLoading,
    isStreaming,
    currentProviderConfigured,
    settings,
    contacts,
    tasks,
    processToolCalls,
    saveCurrentSession,
  ]);

  const handleNewChat = useCallback(() => {
    createNewSession();
    setMessages([]);
  }, [createNewSession]);

  const handleSuggestion = useCallback(
    async (text: string) => {
      if (!currentProviderConfigured) return;

      const apiKey =
        settings.provider === 'gemini' ? settings.geminiApiKey : settings.openaiApiKey;
      if (!apiKey) return;

      // Create abort controller
      abortControllerRef.current = new AbortController();

      // Add user message directly with the suggestion text
      const userMessage: ChatMessageData = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        content: text,
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setIsLoading(true);
      setIsStreaming(true);

      const systemPrompt = buildCRMSystemPrompt(contacts, tasks);

      // Convert to service format
      const serviceMessages: ServiceChatMessage[] = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
        toolCalls: m.toolCalls,
        toolResults: m.toolResults?.map((r) => ({
          toolCallId: r.toolCallId,
          name: r.name,
          result: r.result,
        })),
      }));

      // Create assistant message placeholder
      const assistantMessage: ChatMessageData = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: '',
        isStreaming: true,
      };

      setMessages([...updatedMessages, assistantMessage]);

      let responseContent = '';
      const toolCalls: ToolCall[] = [];

      const streamFn = settings.provider === 'openai' ? streamOpenAI : streamGemini;

      try {
        await streamFn(
          apiKey,
          serviceMessages,
          systemPrompt,
          {
            onText: (newText) => {
              responseContent += newText;
              setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  lastMsg.content = responseContent;
                }
                return [...updated];
              });
            },
            onToolCall: (toolCall) => {
              toolCalls.push(toolCall);
            },
            onDone: async () => {
              const finalMessages = [...updatedMessages, {
                ...assistantMessage,
                content: responseContent,
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                isStreaming: false,
              }];

              setMessages(finalMessages);

              // Process tool calls if any
              if (toolCalls.length > 0) {
                await processToolCalls(toolCalls, finalMessages, 0);
              } else {
                await saveCurrentSession(finalMessages);
              }

              setIsStreaming(false);
              setIsLoading(false);
            },
            onError: (error) => {
              setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  lastMsg.content = `Error: ${error}`;
                  lastMsg.isStreaming = false;
                }
                return [...updated];
              });
              setIsStreaming(false);
              setIsLoading(false);
            },
          },
          abortControllerRef.current?.signal
        );
      } catch (error) {
        setIsStreaming(false);
        setIsLoading(false);
      }
    },
    [
      messages,
      currentProviderConfigured,
      settings,
      contacts,
      tasks,
      processToolCalls,
      saveCurrentSession,
    ]
  );

  const suggestions = useMemo(() => getSuggestions(), []);
  const providerName = settings.provider === 'gemini' ? 'Gemini' : 'OpenAI';

  // Memoized dashboard calculations
  const { activeContacts, driftingContacts, pendingTasks, overdueTasks, upcomingTasks } = useMemo(() => {
    const now = new Date();
    const nowTime = now.getTime();
    const weekFromNow = new Date(nowTime + 7 * 24 * 60 * 60 * 1000);

    const active = contacts.filter((c) => c.status === 'active').length;
    const drifting = contacts.filter((c) => c.status === 'drifting').length;
    const pending = tasks.filter((t) => !t.completed).length;
    const overdue = tasks.filter(
      (t) => !t.completed && t.dueDate && new Date(t.dueDate) < now
    ).length;

    const upcoming = tasks
      .filter(
        (t) =>
          !t.completed &&
          t.dueDate &&
          new Date(t.dueDate) >= now &&
          new Date(t.dueDate) <= weekFromNow
      )
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5);

    return {
      activeContacts: active,
      driftingContacts: drifting,
      pendingTasks: pending,
      overdueTasks: overdue,
      upcomingTasks: upcoming,
    };
  }, [contacts, tasks]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return { backgroundColor: 'rgba(34, 197, 94, 0.2)' };
      case 'drifting':
        return { backgroundColor: 'rgba(234, 179, 8, 0.2)' };
      case 'lost':
        return { backgroundColor: 'rgba(239, 68, 68, 0.2)' };
      default:
        return {};
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return { backgroundColor: '#ef4444' };
      case 'medium':
        return { backgroundColor: '#eab308' };
      case 'low':
        return { backgroundColor: '#22c55e' };
      default:
        return { backgroundColor: '#64748b' };
    }
  };

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessageData; index: number }) => (
      <ChatMessage
        message={item}
        contacts={contacts}
        isLastMessage={index === messages.length - 1}
      />
    ),
    [contacts, messages.length]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.aiLogo}>
        <Text style={styles.aiLogoText}>AI</Text>
      </View>
      <Text style={styles.emptyTitle}>tethru AI</Text>
      <Text style={styles.emptySubtitle}>
        {currentProviderConfigured
          ? 'Ask me anything about your contacts and tasks'
          : 'Configure your AI provider to get started'}
      </Text>

      {currentProviderConfigured && (
        <View style={styles.suggestionsGrid}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionCard}
              onPress={() => handleSuggestion(suggestion.text)}
            >
              <Text style={styles.suggestionText}>{suggestion.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!currentProviderConfigured && (
        <TouchableOpacity
          style={styles.configureButton}
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.configureButtonText}>Configure AI Provider</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render dashboard view when AI is not configured
  const renderDashboardView = () => (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.dashboardScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* AI Configuration Banner */}
        <TouchableOpacity
          style={styles.aiBanner}
          onPress={() => setShowSettings(true)}
        >
          <View style={styles.aiBannerIcon}>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </View>
          <View style={styles.aiBannerContent}>
            <Text style={styles.aiBannerTitle}>Enable AI Assistant</Text>
            <Text style={styles.aiBannerSubtitle}>
              Configure your API key to unlock AI-powered features
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#a78bfa" />
        </TouchableOpacity>

        {/* Dashboard Header */}
        <Text style={styles.dashboardGreeting}>Your CRM Overview</Text>
        <Text style={styles.dashboardSubtitle}>
          {contacts.length} contacts · {pendingTasks} pending tasks
        </Text>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.activeCard]}>
            <Text style={styles.statNumber}>{activeContacts}</Text>
            <Text style={styles.statLabel}>Active Contacts</Text>
          </View>
          <View style={[styles.statCard, styles.driftingCard]}>
            <Text style={styles.statNumber}>{driftingContacts}</Text>
            <Text style={styles.statLabel}>Need Attention</Text>
          </View>
          <View style={[styles.statCard, styles.tasksCard]}>
            <Text style={styles.statNumber}>{pendingTasks}</Text>
            <Text style={styles.statLabel}>Pending Tasks</Text>
          </View>
          <View style={[styles.statCard, styles.overdueCard]}>
            <Text style={styles.statNumber}>{overdueTasks}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AddContact')}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="person-add-outline" size={18} color="#3b82f6" />
            </View>
            <Text style={styles.actionText}>Add Contact</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('LogInteraction', {})}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="chatbubble-outline" size={18} color="#3b82f6" />
            </View>
            <Text style={styles.actionText}>Log Interaction</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AddTask', {})}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="checkbox-outline" size={18} color="#3b82f6" />
            </View>
            <Text style={styles.actionText}>Add Task</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Tasks */}
        {upcomingTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
            {upcomingTasks.map((task) => {
              const contact = contacts.find((c) => c.id === task.contactId);
              const dueDate = task.dueDate ? new Date(task.dueDate) : null;
              const isToday =
                dueDate && dueDate.toDateString() === new Date().toDateString();
              const isTomorrow =
                dueDate &&
                dueDate.toDateString() ===
                  new Date(Date.now() + 86400000).toDateString();

              let dueDateText = task.dueDate;
              if (isToday) dueDateText = 'Today';
              else if (isTomorrow) dueDateText = 'Tomorrow';

              return (
                <View key={task.id} style={styles.taskItem}>
                  <View
                    style={[styles.priorityIndicator, getPriorityStyle(task.priority)]}
                  />
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View style={styles.taskMeta}>
                      {contact && (
                        <Text style={styles.taskContact}>
                          {contact.firstName} {contact.lastName}
                        </Text>
                      )}
                      <Text
                        style={[
                          styles.taskDue,
                          isToday && styles.taskDueToday,
                        ]}
                      >
                        {dueDateText}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Recent Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Contacts</Text>
          {contacts.slice(0, 5).map((contact) => (
            <TouchableOpacity
              key={contact.id}
              style={styles.contactItem}
              onPress={() => navigation.navigate('ContactDetail', { contactId: contact.id })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {contact.firstName[0]}
                  {contact.lastName[0]}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>
                  {contact.firstName} {contact.lastName}
                </Text>
                <Text style={styles.contactCompany}>{contact.company}</Text>
              </View>
              <View style={[styles.statusBadge, getStatusStyle(contact.status)]}>
                <Text style={styles.statusText}>{contact.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contacts Needing Attention */}
        {driftingContacts > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Needs Attention</Text>
            {contacts
              .filter((c) => c.status === 'drifting')
              .slice(0, 3)
              .map((contact) => (
                <TouchableOpacity
                  key={contact.id}
                  style={styles.contactItem}
                  onPress={() =>
                    navigation.navigate('ContactDetail', { contactId: contact.id })
                  }
                >
                  <View style={[styles.avatar, styles.driftingAvatar]}>
                    <Text style={styles.avatarText}>
                      {contact.firstName[0]}
                      {contact.lastName[0]}
                    </Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>
                      {contact.firstName} {contact.lastName}
                    </Text>
                    <Text style={styles.contactCompany}>
                      {contact.lastContacted
                        ? `Last contacted: ${contact.lastContacted}`
                        : 'Never contacted'}
                    </Text>
                  </View>
                  <Ionicons name="alert-circle" size={20} color="#eab308" />
                </TouchableOpacity>
              ))}
          </View>
        )}

      </ScrollView>

      <LLMSettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />
    </SafeAreaView>
  );

  // If AI is not configured, show dashboard with configure banner
  if (!currentProviderConfigured) {
    return renderDashboardView();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('Dashboard')}
            >
              <Ionicons name="grid-outline" size={20} color="#94a3b8" />
            </TouchableOpacity>
            {sessions.length > 0 && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={toggleHistory}
              >
                <Ionicons name="time-outline" size={20} color="#a78bfa" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>tethru AI</Text>
          </View>

          <View style={styles.headerActions}>
            {messages.length > 0 && (
              <TouchableOpacity style={styles.iconButton} onPress={handleNewChat}>
                <Ionicons name="add" size={22} color="#a78bfa" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Messages */}
        <FlatList
          key={currentSessionId || 'new-chat'}
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={
            messages.length === 0
              ? styles.emptyContainer
              : styles.messagesContent
          }
          ListEmptyComponent={renderEmptyState}
          keyboardShouldPersistTaps="handled"
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={Platform.OS === 'android'}
          windowSize={10}
        />

        {/* Input */}
        <ChatInput
          value={inputValue}
          onChangeText={setInputValue}
          onSend={handleSend}
          onStop={handleStop}
          isLoading={isLoading}
          isStreaming={isStreaming}
          isConfigured={currentProviderConfigured}
          providerName={currentProviderConfigured ? providerName : undefined}
        />
      </KeyboardAvoidingView>

      <LLMSettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />
      <ChatHistoryModal
        visible={isHistoryOpen}
        onClose={toggleHistory}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
        onNewChat={handleNewChat}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 80,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    minWidth: 80,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  aiLogo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  aiLogoText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  suggestionsGrid: {
    width: '100%',
    gap: 12,
  },
  suggestionCard: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    padding: 16,
  },
  suggestionText: {
    color: '#a78bfa',
    fontSize: 14,
    textAlign: 'center',
  },
  configureButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  configureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Dashboard styles
  dashboardScroll: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  aiBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiBannerContent: {
    flex: 1,
  },
  aiBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  aiBannerSubtitle: {
    fontSize: 13,
    color: '#a78bfa',
  },
  dashboardGreeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  dashboardSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1e293b',
  },
  activeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  driftingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#eab308',
  },
  tasksCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  overdueCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    fontSize: 16,
    color: '#fff',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  priorityIndicator: {
    width: 4,
    height: '100%',
    minHeight: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  taskContact: {
    fontSize: 13,
    color: '#64748b',
  },
  taskDue: {
    fontSize: 13,
    color: '#94a3b8',
  },
  taskDueToday: {
    color: '#f87171',
    fontWeight: '500',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driftingAvatar: {
    backgroundColor: '#eab308',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  contactCompany: {
    fontSize: 14,
    color: '#94a3b8',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'capitalize',
  },
});
