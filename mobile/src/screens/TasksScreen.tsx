import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToTasks, subscribeToContacts, updateTask } from '../services/firestoreService';
import type { Task, Contact } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

export const TasksScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubTasks = subscribeToTasks(user.uid, setTasks);
    const unsubContacts = subscribeToContacts(user.uid, setContacts);
    return () => {
      unsubTasks();
      unsubContacts();
    };
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const toggleTaskComplete = async (task: Task) => {
    if (!user) return;
    await updateTask(user.uid, task.id, { completed: !task.completed });
  };

  const getContactName = (contactId?: string): string => {
    if (!contactId) return '';
    const contact = contacts.find((c) => c.id === contactId);
    return contact ? `${contact.firstName} ${contact.lastName}` : '';
  };

  const isOverdue = (dueDate?: string): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const filteredTasks = tasks.filter((task) => showCompleted || !task.completed);
  const sortedTasks = filteredTasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    return 0;
  });

  const renderTask = ({ item }: { item: Task }) => (
    <View style={[styles.taskCard, item.completed && styles.taskCompleted]}>
      <TouchableOpacity
        style={[styles.checkbox, item.completed && styles.checkboxChecked]}
        onPress={() => toggleTaskComplete(item)}
      >
        {item.completed && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.taskInfo}
        onPress={() => navigation.navigate('EditTask', { taskId: item.id })}
      >
        <Text style={[styles.taskTitle, item.completed && styles.taskTitleCompleted]}>
          {item.title}
        </Text>
        {item.contactId && (
          <Text style={styles.taskContact}>{getContactName(item.contactId)}</Text>
        )}
        <View style={styles.taskMeta}>
          {item.dueDate && (
            <Text style={[styles.dueDate, isOverdue(item.dueDate) && !item.completed && styles.overdue]}>
              {new Date(item.dueDate).toLocaleDateString()}
            </Text>
          )}
          <View style={[styles.priorityBadge, styles[`priority_${item.priority}` as keyof typeof styles]]}>
            <Text style={styles.priorityText}>{item.priority}</Text>
          </View>
        </View>
        <Text style={styles.editHint}>Tap to edit</Text>
      </TouchableOpacity>
    </View>
  );

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{completedCount}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setShowCompleted(!showCompleted)}
      >
        <Text style={styles.toggleText}>
          {showCompleted ? 'Hide Completed' : 'Show Completed'}
        </Text>
      </TouchableOpacity>

      <FlatList
        data={sortedTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No tasks yet</Text>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddTask', {})}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  summary: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  toggleButton: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  toggleText: {
    color: '#3b82f6',
    fontSize: 14,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  taskCompleted: {
    opacity: 0.6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  taskContact: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  dueDate: {
    fontSize: 13,
    color: '#64748b',
  },
  overdue: {
    color: '#ef4444',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priority_low: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  priority_medium: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
  },
  priority_high: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  priorityText: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'capitalize',
  },
  editHint: {
    color: '#3b82f6',
    fontSize: 11,
    marginTop: 6,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    marginTop: -2,
  },
});
