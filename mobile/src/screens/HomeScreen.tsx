import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useLLMSettings } from '../contexts/LLMSettingsContext';
import { subscribeToContacts, subscribeToTasks } from '../services/firestoreService';
import { sendAIMessage, getSuggestions, ChatMessage } from '../services/aiService';
import { LLMSettingsModal } from '../components/LLMSettingsModal';
import type { Contact, Task } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

export const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const { settings, currentProviderConfigured } = useLLMSettings();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // AI Chat state
  const [showSettings, setShowSettings] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubContacts = subscribeToContacts(user.uid, setContacts);
    const unsubTasks = subscribeToTasks(user.uid, setTasks);

    return () => {
      unsubContacts();
      unsubTasks();
    };
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading || !currentProviderConfigured) return;

    const apiKey = settings.provider === 'gemini' ? settings.geminiApiKey : settings.openaiApiKey;
    if (!apiKey) return;

    const userMessage: ChatMessage = { role: 'user', content: message };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsLoading(true);
    setShowChat(true);

    try {
      const response = await sendAIMessage(
        message,
        chatMessages,
        { provider: settings.provider, apiKey },
        contacts,
        tasks
      );

      const assistantMessage: ChatMessage = { role: 'assistant', content: response };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to get response'}`,
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setChatMessages([]);
    setShowChat(false);
  };

  const activeContacts = contacts.filter((c) => c.status === 'active').length;
  const driftingContacts = contacts.filter((c) => c.status === 'drifting').length;
  const pendingTasks = tasks.filter((t) => !t.completed).length;
  const overdueTasks = tasks.filter(
    (t) => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  const suggestions = getSuggestions();

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.greeting}>Welcome back!</Text>
        <Text style={styles.subtitle}>Here's your relationship overview</Text>

        {/* AI Assistant Card */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIconContainer}>
              <Text style={styles.aiIcon}>AI</Text>
            </View>
            <View style={styles.aiTitleContainer}>
              <Text style={styles.aiTitle}>Nexus AI</Text>
              <Text style={styles.aiSubtitle}>
                {currentProviderConfigured
                  ? `Powered by ${settings.provider === 'gemini' ? 'Gemini' : 'OpenAI'}`
                  : 'Configure to enable'}
              </Text>
            </View>
            <TouchableOpacity style={styles.aiSettingsButton} onPress={() => setShowSettings(true)}>
              <Text style={styles.aiSettingsIcon}>Settings</Text>
            </TouchableOpacity>
          </View>

          {currentProviderConfigured ? (
            <>
              {showChat && chatMessages.length > 0 ? (
                <View style={styles.chatContainer}>
                  <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
                    <Text style={styles.newChatButtonText}>+ New Chat</Text>
                  </TouchableOpacity>
                  <ScrollView style={styles.messagesContainer} nestedScrollEnabled>
                    {chatMessages.map((msg, index) => (
                      <View
                        key={index}
                        style={[
                          styles.messageContainer,
                          msg.role === 'user' ? styles.userMessage : styles.assistantMessage,
                        ]}
                      >
                        <Text style={styles.messageText}>{msg.content}</Text>
                      </View>
                    ))}
                    {isLoading && (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator color="#8b5cf6" />
                        <Text style={styles.loadingText}>Thinking...</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.suggestionsContainer}>
                  {suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionButton}
                      onPress={() => handleSendMessage(suggestion.text)}
                    >
                      <Text style={styles.suggestionText}>{suggestion.text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.chatInputContainer}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Ask about your contacts..."
                  placeholderTextColor="#64748b"
                  value={chatInput}
                  onChangeText={setChatInput}
                  onSubmitEditing={() => handleSendMessage(chatInput)}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!chatInput.trim() || isLoading) && styles.sendButtonDisabled]}
                  onPress={() => handleSendMessage(chatInput)}
                  disabled={!chatInput.trim() || isLoading}
                >
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity style={styles.configureButton} onPress={() => setShowSettings(true)}>
              <Text style={styles.configureButtonText}>Configure AI Provider</Text>
            </TouchableOpacity>
          )}
        </View>

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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AddContact')}>
          <Text style={styles.actionIcon}>+</Text>
          <Text style={styles.actionText}>Add Contact</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('LogInteraction', {})}>
          <Text style={styles.actionIcon}>+</Text>
          <Text style={styles.actionText}>Log Interaction</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AddTask', {})}>
          <Text style={styles.actionIcon}>+</Text>
          <Text style={styles.actionText}>Add Task</Text>
        </TouchableOpacity>
      </View>

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
                {contact.firstName[0]}{contact.lastName[0]}
              </Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>
                {contact.firstName} {contact.lastName}
              </Text>
              <Text style={styles.contactCompany}>{contact.company}</Text>
            </View>
            <View style={[styles.statusBadge, styles[`status_${contact.status}`]]}>
              <Text style={styles.statusText}>{contact.status}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>

    <LLMSettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  subtitle: {
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
  actionIcon: {
    fontSize: 24,
    color: '#3b82f6',
    marginRight: 12,
  },
  actionText: {
    fontSize: 16,
    color: '#fff',
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
  status_active: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  status_drifting: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
  },
  status_lost: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusText: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'capitalize',
  },
  // AI Card styles
  aiCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  aiTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  aiSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  aiSettingsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
  },
  aiSettingsIcon: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  configureButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  configureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  suggestionButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  suggestionText: {
    color: '#a78bfa',
    fontSize: 13,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  chatContainer: {
    marginBottom: 12,
  },
  newChatButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    marginBottom: 12,
  },
  newChatButtonText: {
    color: '#8b5cf6',
    fontSize: 12,
    fontWeight: '500',
  },
  messagesContainer: {
    maxHeight: 200,
    marginBottom: 8,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: '85%',
  },
  userMessage: {
    backgroundColor: '#8b5cf6',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    backgroundColor: '#0f172a',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#334155',
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  loadingText: {
    color: '#8b5cf6',
    fontSize: 14,
  },
});
