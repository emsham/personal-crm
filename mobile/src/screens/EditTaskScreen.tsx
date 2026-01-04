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
  ActivityIndicator,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  updateTask,
  deleteTask,
  subscribeToContacts,
  subscribeToTasks,
} from '../services/firestoreService';
import type { Task, TaskFrequency, Contact } from '../types';

type RouteParams = {
  EditTask: { taskId: string };
};

// Special values for reminder
const REMINDER_AT_TIME = -1; // Remind at time of task
const REMINDER_CUSTOM = -2; // Custom value

export const EditTaskScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'EditTask'>>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);

  // Date/Time picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);

  // Reminder states
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderSelection, setReminderSelection] = useState<number | undefined>(undefined);
  const [customReminderMinutes, setCustomReminderMinutes] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contactId: '',
    priority: 'medium' as Task['priority'],
    frequency: 'none' as TaskFrequency,
    completed: false,
  });

  // Subscribe to contacts and tasks
  useEffect(() => {
    if (!user) return;
    const unsubContacts = subscribeToContacts(user.uid, setContacts);
    const unsubTasks = subscribeToTasks(user.uid, setTasks);
    return () => {
      unsubContacts();
      unsubTasks();
    };
  }, [user]);

  // Load task data when it becomes available
  useEffect(() => {
    const task = tasks.find((t) => t.id === route.params.taskId);
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        contactId: task.contactId || '',
        priority: task.priority,
        frequency: task.frequency,
        completed: task.completed,
      });

      // Parse and set date
      if (task.dueDate) {
        const [year, month, day] = task.dueDate.split('-').map(Number);
        setSelectedDate(new Date(year, month - 1, day));
      }

      // Parse and set time
      if (task.dueTime) {
        const [hours, minutes] = task.dueTime.split(':').map(Number);
        const timeDate = new Date();
        timeDate.setHours(hours, minutes, 0, 0);
        setSelectedTime(timeDate);
      }

      // Set reminder selection
      if (task.reminderBefore !== undefined) {
        if (task.reminderBefore === 0) {
          setReminderSelection(REMINDER_AT_TIME);
        } else if ([15, 30, 60, 120].includes(task.reminderBefore)) {
          setReminderSelection(task.reminderBefore);
        } else {
          setReminderSelection(REMINDER_CUSTOM);
          setCustomReminderMinutes(task.reminderBefore.toString());
        }
      }

      setInitialLoading(false);
    }
  }, [tasks, route.params.taskId]);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      // Format date as YYYY-MM-DD
      const dueDate = selectedDate
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        : undefined;

      // Format time as HH:MM
      const dueTime = selectedTime
        ? `${String(selectedTime.getHours()).padStart(2, '0')}:${String(selectedTime.getMinutes()).padStart(2, '0')}`
        : undefined;

      // Calculate reminder value
      let reminderBefore: number | undefined;
      if (reminderSelection === REMINDER_AT_TIME) {
        reminderBefore = 0;
      } else if (reminderSelection === REMINDER_CUSTOM) {
        reminderBefore = parseInt(customReminderMinutes, 10) || undefined;
      } else {
        reminderBefore = reminderSelection;
      }

      await updateTask(user.uid, route.params.taskId, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        contactId: formData.contactId || undefined,
        dueDate,
        dueTime,
        reminderBefore,
        priority: formData.priority,
        frequency: formData.frequency,
        completed: formData.completed,
      });

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setDeleting(true);
            try {
              await deleteTask(user.uid, route.params.taskId);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete task');
              setDeleting(false);
            }
          },
        },
      ]
    );
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

  const reminderOptions: { value: number; label: string }[] = [
    { value: REMINDER_AT_TIME, label: 'At time of task' },
    { value: 15, label: '15 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
    { value: 120, label: '2 hours before' },
    { value: REMINDER_CUSTOM, label: 'Custom...' },
  ];

  const getSelectedReminderLabel = (): string => {
    if (reminderSelection === undefined) return 'Use Default';
    if (reminderSelection === REMINDER_AT_TIME) return 'At time of task';
    if (reminderSelection === REMINDER_CUSTOM) {
      return customReminderMinutes ? `${customReminderMinutes} min before` : 'Custom';
    }
    const option = reminderOptions.find((o) => o.value === reminderSelection);
    return option?.label || 'Use Default';
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (date) {
      setSelectedTime(date);
    }
  };

  const handleReminderSelect = (value: number) => {
    setReminderSelection(value);
    if (value !== REMINDER_CUSTOM) {
      setShowReminderModal(false);
    }
  };

  const handleCustomReminderSave = () => {
    if (customReminderMinutes && parseInt(customReminderMinutes, 10) > 0) {
      setShowReminderModal(false);
    } else {
      Alert.alert('Error', 'Please enter a valid number of minutes');
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading task...</Text>
      </View>
    );
  }

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

        <Text style={styles.sectionTitle}>Status</Text>
        <TouchableOpacity
          style={[
            styles.statusButton,
            formData.completed && styles.statusCompleted,
          ]}
          onPress={() => setFormData({ ...formData, completed: !formData.completed })}
        >
          <Text style={styles.statusCheckbox}>
            {formData.completed ? '✓' : '○'}
          </Text>
          <Text style={styles.statusText}>
            {formData.completed ? 'Completed' : 'Mark as Complete'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Due Date & Time</Text>
        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            style={[styles.pickerButton, styles.dateInput]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={selectedDate ? styles.pickerButtonTextSelected : styles.pickerButtonText}>
              {selectedDate ? formatDate(selectedDate) : 'Select Date'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pickerButton, styles.timeInput]}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={selectedTime ? styles.pickerButtonTextSelected : styles.pickerButtonText}>
              {selectedTime ? formatTime(selectedTime) : 'Time'}
            </Text>
          </TouchableOpacity>
        </View>
        {selectedDate && (
          <TouchableOpacity onPress={() => { setSelectedDate(null); setSelectedTime(null); }}>
            <Text style={styles.clearLink}>Clear date & time</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.inputHint}>Time is optional. Leave empty for 9 AM notification.</Text>

        {/* iOS shows inline picker */}
        {showDatePicker && Platform.OS === 'ios' && (
          <View style={styles.inlinePicker}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              textColor="#fff"
              themeVariant="dark"
            />
          </View>
        )}

        {showTimePicker && Platform.OS === 'ios' && (
          <View style={styles.inlinePicker}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={selectedTime || new Date()}
              mode="time"
              display="spinner"
              onChange={handleTimeChange}
              textColor="#fff"
              themeVariant="dark"
            />
          </View>
        )}

        {/* Android shows modal picker */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={selectedDate || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        {showTimePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={selectedTime || new Date()}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )}

        <Text style={styles.sectionTitle}>Reminder</Text>
        <TouchableOpacity
          style={styles.reminderPicker}
          onPress={() => setShowReminderModal(true)}
        >
          <Text style={styles.reminderPickerText}>{getSelectedReminderLabel()}</Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Priority</Text>
        <View style={styles.optionsRow}>
          {priorities.map((priority) => (
            <TouchableOpacity
              key={priority}
              style={[
                styles.optionButton,
                formData.priority === priority && styles.optionSelected,
                formData.priority === priority && styles[`priority_${priority}` as keyof typeof styles],
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
          <Text style={selectedContact ? styles.contactPickerTextSelected : styles.contactPickerText}>
            {selectedContact
              ? `${selectedContact.firstName} ${selectedContact.lastName}`
              : 'Select a contact (optional)'}
          </Text>
          <Text style={styles.dropdownArrow}>{showContactPicker ? '▲' : '▼'}</Text>
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
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <TouchableOpacity
            style={[styles.deleteButton, deleting && styles.buttonDisabled]}
            onPress={handleDelete}
            disabled={deleting}
          >
            <Text style={styles.deleteButtonText}>
              {deleting ? 'Deleting...' : 'Delete Task'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Reminder Modal */}
      <Modal
        visible={showReminderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReminderModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReminderModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Reminder</Text>

            <TouchableOpacity
              style={[
                styles.modalOption,
                reminderSelection === undefined && styles.modalOptionSelected,
              ]}
              onPress={() => { setReminderSelection(undefined); setShowReminderModal(false); }}
            >
              <Text style={[
                styles.modalOptionText,
                reminderSelection === undefined && styles.modalOptionTextSelected,
              ]}>Use Default</Text>
            </TouchableOpacity>

            {reminderOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  reminderSelection === option.value && styles.modalOptionSelected,
                ]}
                onPress={() => handleReminderSelect(option.value)}
              >
                <Text style={[
                  styles.modalOptionText,
                  reminderSelection === option.value && styles.modalOptionTextSelected,
                ]}>{option.label}</Text>
              </TouchableOpacity>
            ))}

            {reminderSelection === REMINDER_CUSTOM && (
              <View style={styles.customReminderContainer}>
                <TextInput
                  style={styles.customReminderInput}
                  placeholder="Minutes before"
                  placeholderTextColor="#64748b"
                  value={customReminderMinutes}
                  onChangeText={setCustomReminderMinutes}
                  keyboardType="number-pad"
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.customReminderButton}
                  onPress={handleCustomReminderSave}
                >
                  <Text style={styles.customReminderButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowReminderModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 16,
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
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: '#22c55e',
  },
  statusCheckbox: {
    fontSize: 20,
    color: '#22c55e',
    marginRight: 12,
  },
  statusText: {
    fontSize: 16,
    color: '#fff',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 2,
  },
  timeInput: {
    flex: 1,
  },
  pickerButton: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  pickerButtonText: {
    color: '#64748b',
    fontSize: 16,
  },
  pickerButtonTextSelected: {
    color: '#fff',
    fontSize: 16,
  },
  clearLink: {
    color: '#3b82f6',
    fontSize: 13,
    marginTop: -8,
    marginBottom: 4,
  },
  inputHint: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  inlinePicker: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  pickerDone: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  reminderPicker: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderPickerText: {
    color: '#fff',
    fontSize: 16,
  },
  dropdownArrow: {
    color: '#64748b',
    fontSize: 12,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactPickerText: {
    color: '#64748b',
    fontSize: 16,
  },
  contactPickerTextSelected: {
    color: '#fff',
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
  dangerZone: {
    marginTop: 32,
    marginBottom: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  dangerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  deleteButton: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    width: '100%',
    maxWidth: 340,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#0f172a',
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  modalOptionText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
  },
  modalOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  customReminderContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  customReminderInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  customReminderButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  customReminderButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalCancelButton: {
    marginTop: 8,
    padding: 14,
  },
  modalCancelText: {
    color: '#64748b',
    fontSize: 15,
    textAlign: 'center',
  },
});
