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
import { addInteraction, subscribeToContacts, updateContact } from '../services/firestoreService';
import { InteractionType } from '../types';
import type { Contact } from '../types';

type RouteParams = {
  LogInteraction: { contactId?: string };
};

export const LogInteractionScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'LogInteraction'>>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);

  const [formData, setFormData] = useState({
    contactId: route.params?.contactId || '',
    type: InteractionType.MEETING,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToContacts(user.uid, setContacts);
    return unsubscribe;
  }, [user]);

  const handleSubmit = async () => {
    if (!formData.contactId) {
      Alert.alert('Error', 'Please select a contact');
      return;
    }

    if (!formData.notes.trim()) {
      Alert.alert('Error', 'Please add some notes about the interaction');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      await addInteraction(user.uid, {
        contactId: formData.contactId,
        type: formData.type,
        date: formData.date,
        notes: formData.notes.trim(),
      });

      // Update the contact's lastContacted date
      await updateContact(user.uid, formData.contactId, {
        lastContacted: formData.date,
        status: 'active',
      });

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to log interaction');
    } finally {
      setLoading(false);
    }
  };

  const selectedContact = contacts.find((c) => c.id === formData.contactId);

  const interactionTypes = Object.values(InteractionType);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Contact *</Text>
        <TouchableOpacity
          style={styles.contactPicker}
          onPress={() => setShowContactPicker(!showContactPicker)}
        >
          {selectedContact ? (
            <View style={styles.selectedContact}>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>
                  {selectedContact.firstName[0]}
                  {selectedContact.lastName[0]}
                </Text>
              </View>
              <Text style={styles.selectedContactText}>
                {selectedContact.firstName} {selectedContact.lastName}
              </Text>
            </View>
          ) : (
            <Text style={styles.contactPickerPlaceholder}>Select a contact</Text>
          )}
        </TouchableOpacity>

        {showContactPicker && (
          <View style={styles.contactList}>
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

        <Text style={styles.sectionTitle}>Interaction Type</Text>
        <View style={styles.typeGrid}>
          {interactionTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                formData.type === type && styles.typeSelected,
              ]}
              onPress={() => setFormData({ ...formData, type })}
            >
              <Text style={styles.typeEmoji}>
                {type === InteractionType.MEETING && '🤝'}
                {type === InteractionType.CALL && '📞'}
                {type === InteractionType.EMAIL && '✉️'}
                {type === InteractionType.COFFEE && '☕'}
                {type === InteractionType.EVENT && '🎉'}
                {type === InteractionType.OTHER && '📝'}
              </Text>
              <Text
                style={[
                  styles.typeText,
                  formData.type === type && styles.typeTextSelected,
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Date</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#64748b"
          value={formData.date}
          onChangeText={(text) => setFormData({ ...formData, date: text })}
        />

        <Text style={styles.sectionTitle}>Notes *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What did you talk about? Any action items?"
          placeholderTextColor="#64748b"
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

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
              {loading ? 'Saving...' : 'Log Interaction'}
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
  },
  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },
  contactPicker: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contactPickerPlaceholder: {
    color: '#64748b',
    fontSize: 16,
  },
  selectedContact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedContactText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
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
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  contactItemText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeButton: {
    width: '30%',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  typeSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3b82f6',
  },
  typeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  typeTextSelected: {
    color: '#fff',
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
