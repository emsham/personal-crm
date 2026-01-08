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
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const [contactSearchQuery, setContactSearchQuery] = useState('');

  // Date/Time picker states
  const [activePicker, setActivePicker] = useState<'date' | 'time' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);

  // Reminder states - undefined means use defaults, empty array means no reminders
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedReminderTimes, setSelectedReminderTimes] = useState<number[] | undefined>(undefined);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contactId: route.params?.contactId || '',
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
      // Format date as YYYY-MM-DD
      const dueDate = selectedDate
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        : undefined;

      // Format time as HH:MM
      const dueTime = selectedTime
        ? `${String(selectedTime.getHours()).padStart(2, '0')}:${String(selectedTime.getMinutes()).padStart(2, '0')}`
        : undefined;

      const newTask: Omit<Task, 'id'> = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        contactId: formData.contactId || undefined,
        dueDate,
        dueTime,
        reminderTimes: selectedReminderTimes, // undefined = use defaults, [] = no reminders
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

  const reminderOptions: { value: number; label: string }[] = [
    { value: 0, label: 'At time of task' },
    { value: 15, label: '15 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
    { value: 120, label: '2 hours before' },
  ];

  const getSelectedReminderLabel = (): string => {
    if (selectedReminderTimes === undefined) return 'Use Default';
    if (selectedReminderTimes.length === 0) return 'No reminders';
    if (selectedReminderTimes.length === 1) {
      const option = reminderOptions.find((o) => o.value === selectedReminderTimes[0]);
      return option?.label || 'Custom';
    }
    return `${selectedReminderTimes.length} reminders`;
  };

  const toggleReminderTime = (value: number) => {
    // If undefined (using defaults), start with empty array and add the value
    if (selectedReminderTimes === undefined) {
      setSelectedReminderTimes([value]);
      return;
    }
    const newTimes = selectedReminderTimes.includes(value)
      ? selectedReminderTimes.filter((t) => t !== value)
      : [...selectedReminderTimes, value].sort((a, b) => a - b);
    setSelectedReminderTimes(newTimes);
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
      setActivePicker(null);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setActivePicker(null);
    }
    if (date) {
      setSelectedTime(date);
    }
  };

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

        <Text style={styles.sectionTitle}>Due Date & Time</Text>
        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            style={[styles.pickerButton, styles.dateInput]}
            onPress={() => {
              // Set today's date if none selected, so "Done" works without scrolling
              if (!selectedDate) {
                setSelectedDate(new Date());
              }
              setActivePicker('date');
            }}
          >
            <Text style={selectedDate ? styles.pickerButtonTextSelected : styles.pickerButtonText}>
              {selectedDate ? formatDate(selectedDate) : 'Select Date'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pickerButton, styles.timeInput]}
            onPress={() => {
              // Set current time if none selected, so "Done" works without scrolling
              if (!selectedTime) {
                setSelectedTime(new Date());
              }
              setActivePicker('time');
            }}
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
        {activePicker && Platform.OS === 'ios' && (
          <View style={styles.inlinePicker}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setActivePicker(null)}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={activePicker === 'date' ? (selectedDate || new Date()) : (selectedTime || new Date())}
              mode={activePicker}
              display="spinner"
              onChange={activePicker === 'date' ? handleDateChange : handleTimeChange}
              textColor="#fff"
              themeVariant="dark"
            />
          </View>
        )}

        {/* Android shows modal picker */}
        {activePicker === 'date' && Platform.OS === 'android' && (
          <DateTimePicker
            value={selectedDate || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        {activePicker === 'time' && Platform.OS === 'android' && (
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
          onPress={() => {
            setShowContactPicker(!showContactPicker);
            if (!showContactPicker) setContactSearchQuery('');
          }}
        >
          <Text style={selectedContact ? styles.contactPickerTextSelected : styles.contactPickerText}>
            {selectedContact
              ? `${selectedContact.firstName} ${selectedContact.lastName}`
              : 'Select a contact (optional)'}
          </Text>
          <Text style={styles.dropdownArrow}>{showContactPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showContactPicker && (
          <View style={styles.contactPickerContainer}>
            <TextInput
              style={styles.contactSearchInput}
              placeholder="Search contacts..."
              placeholderTextColor="#64748b"
              value={contactSearchQuery}
              onChangeText={setContactSearchQuery}
              autoFocus
            />
            <ScrollView
              style={styles.contactList}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity
                style={styles.contactItem}
                onPress={() => {
                  setFormData({ ...formData, contactId: '' });
                  setShowContactPicker(false);
                  setContactSearchQuery('');
                }}
              >
                <Text style={styles.contactItemText}>None</Text>
              </TouchableOpacity>
              {contacts
                .filter((c) => {
                  if (!contactSearchQuery) return true;
                  const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
                  return fullName.includes(contactSearchQuery.toLowerCase());
                })
                .map((contact) => (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.contactItem}
                    onPress={() => {
                      setFormData({ ...formData, contactId: contact.id });
                      setShowContactPicker(false);
                      setContactSearchQuery('');
                    }}
                  >
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>
                        {contact.firstName[0]}
                        {contact.lastName[0]}
                      </Text>
                    </View>
                    <View style={styles.contactItemInfo}>
                      <Text style={styles.contactItemText}>
                        {contact.firstName} {contact.lastName}
                      </Text>
                      {contact.company && (
                        <Text style={styles.contactItemCompany}>{contact.company}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              {contacts.filter((c) => {
                if (!contactSearchQuery) return true;
                const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
                return fullName.includes(contactSearchQuery.toLowerCase());
              }).length === 0 && (
                <Text style={styles.noContactsText}>
                  {contactSearchQuery ? 'No matching contacts' : 'No contacts available'}
                </Text>
              )}
            </ScrollView>
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
            <Text style={styles.modalTitle}>Reminders</Text>

            {/* Use Default option */}
            <TouchableOpacity
              style={[
                styles.modalOption,
                selectedReminderTimes === undefined && styles.modalOptionSelected,
              ]}
              onPress={() => { setSelectedReminderTimes(undefined); setShowReminderModal(false); }}
            >
              <View style={[styles.radioButton, selectedReminderTimes === undefined && styles.radioButtonSelected]}>
                {selectedReminderTimes === undefined && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={[
                styles.modalOptionText,
                selectedReminderTimes === undefined && styles.modalOptionTextSelected,
              ]}>Use Default</Text>
            </TouchableOpacity>

            {/* No reminders option */}
            <TouchableOpacity
              style={[
                styles.modalOption,
                selectedReminderTimes !== undefined && selectedReminderTimes.length === 0 && styles.modalOptionSelected,
              ]}
              onPress={() => { setSelectedReminderTimes([]); setShowReminderModal(false); }}
            >
              <View style={[styles.radioButton, selectedReminderTimes !== undefined && selectedReminderTimes.length === 0 && styles.radioButtonSelected]}>
                {selectedReminderTimes !== undefined && selectedReminderTimes.length === 0 && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={[
                styles.modalOptionText,
                selectedReminderTimes !== undefined && selectedReminderTimes.length === 0 && styles.modalOptionTextSelected,
              ]}>No reminders</Text>
            </TouchableOpacity>

            <View style={styles.modalDivider} />
            <Text style={styles.modalSubtitle}>Or select specific times:</Text>

            {/* Checkbox options */}
            {reminderOptions.map((option) => {
              const isSelected = selectedReminderTimes !== undefined && selectedReminderTimes.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.modalOption, isSelected && styles.modalOptionSelected]}
                  onPress={() => toggleReminderTime(option.value)}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[
                    styles.modalOptionText,
                    isSelected && styles.modalOptionTextSelected,
                  ]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => setShowReminderModal(false)}
            >
              <Text style={styles.modalDoneText}>Done</Text>
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
  contactPickerContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  contactSearchInput: {
    backgroundColor: '#0f172a',
    padding: 12,
    fontSize: 14,
    color: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  contactList: {
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
  contactItemInfo: {
    flex: 1,
  },
  contactItemText: {
    color: '#fff',
    fontSize: 14,
  },
  contactItemCompany: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  noContactsText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
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
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#475569',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#3b82f6',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12,
  },
  modalSubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 12,
  },
  modalDoneButton: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  modalDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
