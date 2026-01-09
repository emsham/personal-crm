import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatSession } from '../../types';

// Moved outside component to avoid recreation on each render
const groupSessionsByDate = (sessions: ChatSession[]) => {
  const groups: { label: string; sessions: ChatSession[] }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const todaySessions: ChatSession[] = [];
  const yesterdaySessions: ChatSession[] = [];
  const lastWeekSessions: ChatSession[] = [];
  const lastMonthSessions: ChatSession[] = [];
  const olderSessions: ChatSession[] = [];

  sessions.forEach(session => {
    const sessionDate = new Date(session.updatedAt);
    sessionDate.setHours(0, 0, 0, 0);

    if (sessionDate.getTime() === today.getTime()) {
      todaySessions.push(session);
    } else if (sessionDate.getTime() === yesterday.getTime()) {
      yesterdaySessions.push(session);
    } else if (sessionDate >= lastWeek) {
      lastWeekSessions.push(session);
    } else if (sessionDate >= lastMonth) {
      lastMonthSessions.push(session);
    } else {
      olderSessions.push(session);
    }
  });

  if (todaySessions.length > 0) {
    groups.push({ label: 'Today', sessions: todaySessions });
  }
  if (yesterdaySessions.length > 0) {
    groups.push({ label: 'Yesterday', sessions: yesterdaySessions });
  }
  if (lastWeekSessions.length > 0) {
    groups.push({ label: 'Last 7 Days', sessions: lastWeekSessions });
  }
  if (lastMonthSessions.length > 0) {
    groups.push({ label: 'Last 30 Days', sessions: lastMonthSessions });
  }
  if (olderSessions.length > 0) {
    groups.push({ label: 'Older', sessions: olderSessions });
  }

  return groups;
};

interface ChatHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onNewChat: () => void;
}

export const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({
  visible,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
}) => {
  // Memoize grouped sessions to avoid recalculation on every render
  const groupedSessions = useMemo(() => groupSessionsByDate(sessions), [sessions]);

  const handleDelete = useCallback((session: ChatSession) => {
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete "${session.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteSession(session.id),
        },
      ]
    );
  }, [onDeleteSession]);

  const handleNewChat = useCallback(() => {
    onNewChat();
    onClose();
  }, [onNewChat, onClose]);

  const renderSession = useCallback((session: ChatSession) => {
    const isSelected = session.id === currentSessionId;
    const messageCount = session.messages.length;
    const previewMessage = session.messages.find(m => m.role === 'user')?.content || '';
    const preview = previewMessage.slice(0, 60) + (previewMessage.length > 60 ? '...' : '');

    return (
      <TouchableOpacity
        key={session.id}
        style={[styles.sessionItem, isSelected && styles.sessionItemSelected]}
        onPress={() => onSelectSession(session.id)}
        onLongPress={() => handleDelete(session)}
      >
        <View style={styles.sessionIcon}>
          <Text style={styles.sessionIconText}>AI</Text>
        </View>
        <View style={styles.sessionContent}>
          <Text
            style={[styles.sessionTitle, isSelected && styles.sessionTitleSelected]}
            numberOfLines={1}
          >
            {session.title}
          </Text>
          <Text style={styles.sessionPreview} numberOfLines={1}>
            {preview || 'No messages'}
          </Text>
          <Text style={styles.sessionMeta}>
            {messageCount} message{messageCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(session)}
        >
          <Text style={styles.deleteButtonText}>X</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [currentSessionId, onSelectSession, handleDelete]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat History</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* New Chat Button */}
        <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
          <Text style={styles.newChatIcon}>+</Text>
          <Text style={styles.newChatText}>New Chat</Text>
        </TouchableOpacity>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>AI</Text>
            <Text style={styles.emptyTitle}>No Chat History</Text>
            <Text style={styles.emptySubtitle}>
              Start a conversation and it will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={groupedSessions}
            keyExtractor={(item) => item.label}
            renderItem={({ item: group }) => (
              <View style={styles.group}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                {group.sessions.map(renderSession)}
              </View>
            )}
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeButtonText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '500',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  newChatIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  newChatText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
  group: {
    marginTop: 16,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  sessionItemSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionIconText: {
    color: '#8b5cf6',
    fontSize: 12,
    fontWeight: '700',
  },
  sessionContent: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#e2e8f0',
    marginBottom: 2,
  },
  sessionTitleSelected: {
    color: '#fff',
  },
  sessionPreview: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  sessionMeta: {
    fontSize: 11,
    color: '#475569',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    lineHeight: 64,
    textAlign: 'center',
    borderRadius: 16,
    backgroundColor: '#1e293b',
    color: '#64748b',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    overflow: 'hidden',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
