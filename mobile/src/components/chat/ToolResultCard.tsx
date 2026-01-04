import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ToolResult } from '../../services/toolExecutors';
import { Contact, Task, Interaction } from '../../types';
import { RootStackParamList } from '../../navigation/AppNavigator';

interface ToolResultCardProps {
  result: ToolResult;
  contacts: Contact[];
}

export const ToolResultCard: React.FC<ToolResultCardProps> = ({ result, contacts }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (!result.success) {
    return (
      <View style={styles.errorCard}>
        <Text style={styles.errorText}>Error: {result.error}</Text>
      </View>
    );
  }

  const data = result.result;

  // Render contacts array
  if (Array.isArray(data) && data.length > 0 && 'firstName' in data[0]) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Found {data.length} contact(s)</Text>
        {(data as Contact[]).slice(0, 5).map((contact) => (
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
              <Text style={styles.contactCompany}>{contact.company || 'No company'}</Text>
            </View>
            <View style={[styles.statusBadge, getStatusStyle(contact.status)]}>
              <Text style={styles.statusText}>{contact.status}</Text>
            </View>
          </TouchableOpacity>
        ))}
        {data.length > 5 && (
          <Text style={styles.moreText}>+{data.length - 5} more</Text>
        )}
      </View>
    );
  }

  // Render tasks array
  if (Array.isArray(data) && data.length > 0 && 'title' in data[0] && 'priority' in data[0]) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Found {data.length} task(s)</Text>
        {(data as Task[]).slice(0, 5).map((task) => (
          <View key={task.id} style={styles.taskItem}>
            <View style={[styles.checkbox, task.completed && styles.checkboxChecked]}>
              {task.completed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, task.completed && styles.taskCompleted]}>
                {task.title}
              </Text>
              <View style={styles.taskMeta}>
                <View style={[styles.priorityBadge, getPriorityStyle(task.priority)]}>
                  <Text style={styles.priorityText}>{task.priority}</Text>
                </View>
                {task.dueDate && (
                  <Text style={styles.dueDate}>Due: {task.dueDate}</Text>
                )}
              </View>
            </View>
          </View>
        ))}
        {data.length > 5 && (
          <Text style={styles.moreText}>+{data.length - 5} more</Text>
        )}
      </View>
    );
  }

  // Render interactions array
  if (Array.isArray(data) && data.length > 0 && 'notes' in data[0] && 'type' in data[0]) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Found {data.length} interaction(s)</Text>
        {(data as Interaction[]).slice(0, 5).map((interaction) => {
          const contact = contacts.find(c => c.id === interaction.contactId);
          return (
            <View key={interaction.id} style={styles.interactionItem}>
              <View style={styles.interactionIcon}>
                <Text style={styles.interactionIconText}>{getInteractionIcon(interaction.type)}</Text>
              </View>
              <View style={styles.interactionInfo}>
                <View style={styles.interactionHeader}>
                  <Text style={styles.interactionType}>{interaction.type}</Text>
                  <Text style={styles.interactionDate}>{interaction.date}</Text>
                </View>
                {contact && (
                  <Text style={styles.interactionContact}>
                    with {contact.firstName} {contact.lastName}
                  </Text>
                )}
                <Text style={styles.interactionNotes} numberOfLines={2}>
                  {interaction.notes}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  // Render contact details
  if (typeof data === 'object' && data !== null && 'contact' in data && 'recentInteractions' in data) {
    const d = data as { contact: Contact; recentInteractions: Interaction[]; pendingTasks: Task[] };
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ContactDetail', { contactId: d.contact.id })}
      >
        <View style={styles.detailHeader}>
          <View style={styles.largeAvatar}>
            <Text style={styles.largeAvatarText}>
              {d.contact.firstName[0]}{d.contact.lastName[0]}
            </Text>
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailName}>
              {d.contact.firstName} {d.contact.lastName}
            </Text>
            <Text style={styles.detailPosition}>
              {d.contact.position} {d.contact.company ? `at ${d.contact.company}` : ''}
            </Text>
            <View style={[styles.statusBadge, getStatusStyle(d.contact.status)]}>
              <Text style={styles.statusText}>{d.contact.status}</Text>
            </View>
          </View>
        </View>
        <View style={styles.detailStats}>
          <View style={styles.detailStat}>
            <Text style={styles.detailStatNumber}>{d.recentInteractions.length}</Text>
            <Text style={styles.detailStatLabel}>Recent Interactions</Text>
          </View>
          <View style={styles.detailStat}>
            <Text style={styles.detailStatNumber}>{d.pendingTasks.length}</Text>
            <Text style={styles.detailStatLabel}>Pending Tasks</Text>
          </View>
        </View>
        {d.contact.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {d.contact.tags.map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Render success response
  if (typeof data === 'object' && data !== null && 'success' in data) {
    const d = data as { success: boolean; contactId?: string; taskId?: string; interactionId?: string };
    if (d.success) {
      let message = 'Operation completed successfully!';
      if (d.contactId) message = 'Contact created successfully!';
      if (d.taskId) message = 'Task created successfully!';
      if (d.interactionId) message = 'Interaction logged successfully!';

      return (
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successText}>{message}</Text>
        </View>
      );
    }
  }

  // Render stats (overview, etc.)
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const statsData = data as Record<string, unknown>;
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          {Object.entries(statsData).map(([key, value]) => {
            if (typeof value === 'object') return null;
            return (
              <View key={key} style={styles.statItem}>
                <Text style={styles.statValue}>{String(value)}</Text>
                <Text style={styles.statLabel}>{formatStatLabel(key)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // Empty results
  if (Array.isArray(data) && data.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No results found</Text>
      </View>
    );
  }

  // Fallback: JSON display
  return (
    <View style={styles.card}>
      <Text style={styles.jsonText}>{JSON.stringify(data, null, 2)}</Text>
    </View>
  );
};

function getStatusStyle(status: string) {
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
}

function getPriorityStyle(priority: string) {
  switch (priority) {
    case 'high':
      return { backgroundColor: 'rgba(239, 68, 68, 0.2)' };
    case 'medium':
      return { backgroundColor: 'rgba(234, 179, 8, 0.2)' };
    case 'low':
      return { backgroundColor: 'rgba(34, 197, 94, 0.2)' };
    default:
      return {};
  }
}

function getInteractionIcon(type: string): string {
  switch (type) {
    case 'Meeting': return '📅';
    case 'Call': return '📞';
    case 'Email': return '✉️';
    case 'Coffee': return '☕';
    case 'Event': return '🎉';
    default: return '💬';
  }
}

function formatStatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
  },
  successCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  successIcon: {
    fontSize: 20,
    color: '#22c55e',
  },
  successText: {
    color: '#4ade80',
    fontSize: 15,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  // Contact item styles
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 10,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  contactCompany: {
    fontSize: 12,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'capitalize',
  },
  moreText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  // Task item styles
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskInfo: {
    flex: 1,
    marginLeft: 10,
  },
  taskTitle: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'capitalize',
  },
  dueDate: {
    fontSize: 11,
    color: '#64748b',
  },
  // Interaction item styles
  interactionItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  interactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  interactionIconText: {
    fontSize: 16,
  },
  interactionInfo: {
    flex: 1,
    marginLeft: 10,
  },
  interactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  interactionType: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
  interactionDate: {
    fontSize: 11,
    color: '#64748b',
  },
  interactionContact: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  interactionNotes: {
    fontSize: 12,
    color: '#64748b',
  },
  // Contact details styles
  detailHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  largeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeAvatarText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
  detailInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  detailName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  detailPosition: {
    fontSize: 13,
    color: '#94a3b8',
    marginVertical: 2,
  },
  detailStats: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    gap: 24,
  },
  detailStat: {
    alignItems: 'center',
  },
  detailStatNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  detailStatLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  tag: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#60a5fa',
  },
  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    width: '48%',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#94a3b8',
  },
});
