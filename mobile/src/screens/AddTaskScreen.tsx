import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { addTask, subscribeToContacts } from '../services/firestoreService';
import type { Task, TaskFrequency, Contact } from '../types';

type RouteParams = {
  AddTask: { contactId?: string };
};

export const AddTaskScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'AddTask'>>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contactId: route.params?.contactId || '',
    dueDate: '',
    priority: 'medium' as Task['priority'],
    frequency: 'none' as TaskFrequency,
  });

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToContacts(user.uid, setContacts);
    return unsubscribe;
  }, [user]);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const newTask: Omit<Task, 'id'> = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        contactId: formData.contactId || undefined,
        dueDate: formData.dueDate || undefined,
        priority: formData.priority,
        frequency: formData.frequency,
        completed: false,
      };

      await addTask(user.uid, newTask);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add task');
    } finally {
      setLoading(false);
    }
  };

  const selectedContact = contacts.find((c) => c.id === formData.contactId);

  const priorities: Task['priority'][] = ['low', 'medium', 'high'];
  const frequencies: { value: TaskFrequency; label: string }[] = [
    { value: 'none', label: 'One-time' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Task Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Task title *"
          placeholderTextColor="#64748b"
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description (optional)"
          placeholderTextColor="#64748b"
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={styles.sectionTitle}>Due Date</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#64748b"
          value={formData.dueDate}
          onChangeText={(text) => setFormData({ ...formData, dueDate: text })}
        />

        <Text style={styles.sectionTitle}>Priority</Text>
        <View style={styles.optionsRow}>
          {priorities.map((priority) => (
            <TouchableOpacity
              key={priority}
              style={[
                styles.optionButton,
                formData.priority === priority && styles.optionSelected,
                formData.priority === priority && styles[`priority_${priority}`],
              ]}
              onPress={() => setFormData({ ...formData, priority })}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.priority === priority && styles.optionTextSelected,
                ]}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Repeat</Text>
        <View style={styles.optionsWrap}>
          {frequencies.map((freq) => (
            <TouchableOpacity
              key={freq.value}
              style={[
                styles.optionButton,
                formData.frequency === freq.value && styles.optionSelected,
              ]}
              onPress={() => setFormData({ ...formData, frequency: freq.value })}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.frequency === freq.value && styles.optionTextSelected,
                ]}
              >
                {freq.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Link to Contact</Text>
        <TouchableOpacity
          style={styles.contactPicker}
          onPress={() => setShowContactPicker(!showContactPicker)}
        >
          <Text style={styles.contactPickerText}>
            {selectedContact
              ? `${selectedContact.firstName} ${selectedContact.lastName}`
              : 'Select a contact (optional)'}
          </Text>
        </TouchableOpacity>

        {showContactPicker && (
          <View style={styles.contactList}>
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => {
                setFormData({ ...formData, contactId: '' });
                setShowContactPicker(false);
              }}
            >
              <Text style={styles.contactItemText}>None</Text>
            </TouchableOpacity>
            {contacts.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                style={styles.contactItem}
                onPress={() => {
                  setFormData({ ...formData, contactId: contact.id });
                  setShowContactPicker(false);
                }}
              >
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>
                    {contact.firstName[0]}
                    {contact.lastName[0]}
                  </Text>
                </View>
                <Text style={styles.contactItemText}>
                  {contact.firstName} {contact.lastName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Saving...' : 'Add Task'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  priority_low: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    borderColor: '#22c55e',
  },
  priority_medium: {
    backgroundColor: 'rgba(234, 179, 8, 0.3)',
    borderColor: '#eab308',
  },
  priority_high: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderColor: '#ef4444',
  },
  optionText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#fff',
  },
  contactPicker: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contactPickerText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  contactList: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: 200,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  contactAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  contactItemText: {
    color: '#fff',
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#1e293b',
  },
  cancelButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#3b82f6',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
