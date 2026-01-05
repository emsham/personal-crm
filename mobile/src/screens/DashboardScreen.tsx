import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToContacts, subscribeToTasks } from '../services/firestoreService';
import type { Contact, Task } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

export const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

  const activeContacts = contacts.filter((c) => c.status === 'active').length;
  const driftingContacts = contacts.filter((c) => c.status === 'drifting').length;
  const pendingTasks = tasks.filter((t) => !t.completed).length;

  // Helper to parse date in local timezone
  const parseLocalDate = (dateStr: string) => new Date(dateStr + 'T00:00:00');

  // Get start of today for comparisons
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTasks = tasks.filter(
    (t) => !t.completed && t.dueDate && parseLocalDate(t.dueDate) < today
  ).length;

  // Get tasks due soon (within 7 days)
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingTasks = tasks
    .filter(
      (t) =>
        !t.completed &&
        t.dueDate &&
        parseLocalDate(t.dueDate) >= today &&
        parseLocalDate(t.dueDate) <= weekFromNow
    )
    .sort((a, b) => parseLocalDate(a.dueDate!).getTime() - parseLocalDate(b.dueDate!).getTime())
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header - outside ScrollView so it's always visible */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← AI</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.greeting}>Your CRM Overview</Text>
      <Text style={styles.subtitle}>
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
          <Text style={styles.actionIcon}>+</Text>
          <Text style={styles.actionText}>Add Contact</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('LogInteraction', {})}
        >
          <Text style={styles.actionIcon}>+</Text>
          <Text style={styles.actionText}>Log Interaction</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddTask', {})}
        >
          <Text style={styles.actionIcon}>+</Text>
          <Text style={styles.actionText}>Add Task</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
          {upcomingTasks.map((task) => {
            const contact = contacts.find((c) => c.id === task.contactId);
            const dueDate = task.dueDate ? parseLocalDate(task.dueDate) : null;
            const todayStr = new Date().toDateString();
            const tomorrowStr = new Date(Date.now() + 86400000).toDateString();
            const isToday = dueDate && dueDate.toDateString() === todayStr;
            const isTomorrow = dueDate && dueDate.toDateString() === tomorrowStr;

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
                <Text style={styles.warningIcon}>⚠️</Text>
              </TouchableOpacity>
            ))}
        </View>
      )}

        {/* Spacer for bottom tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
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
      return { backgroundColor: '#ef4444' };
    case 'medium':
      return { backgroundColor: '#eab308' };
    case 'low':
      return { backgroundColor: '#22c55e' };
    default:
      return { backgroundColor: '#64748b' };
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
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
  backButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#a78bfa',
    fontSize: 14,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 60,
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
  warningIcon: {
    fontSize: 18,
  },
});
