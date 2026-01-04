import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToContacts, subscribeToTasks } from '../services/firestoreService';
import type { Contact, Task } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

export const HomeScreen: React.FC = () => {
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
  const overdueTasks = tasks.filter(
    (t) => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.greeting}>Welcome back!</Text>
      <Text style={styles.subtitle}>Here's your relationship overview</Text>

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
          <View key={contact.id} style={styles.contactItem}>
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
          </View>
        ))}
      </View>
    </ScrollView>
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
});
