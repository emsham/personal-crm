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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import {
  updateInteraction,
  deleteInteraction,
  subscribeToContacts,
  subscribeToInteractions,
} from '../services/firestoreService';
import { InteractionType } from '../types';
import type { Contact, Interaction } from '../types';

type RouteParams = {
  EditInteraction: { interactionId: string };
};

export const EditInteractionScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'EditInteraction'>>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);

  const [formData, setFormData] = useState({
    contactId: '',
    type: InteractionType.MEETING,
    date: '',
    notes: '',
  });

  // Subscribe to contacts and interactions
  useEffect(() => {
    if (!user) return;
    const unsubContacts = subscribeToContacts(user.uid, setContacts);
    const unsubInteractions = subscribeToInteractions(user.uid, setInteractions);
    return () => {
      unsubContacts();
      unsubInteractions();
    };
  }, [user]);

  // Load interaction data when it becomes available
  useEffect(() => {
    const interaction = interactions.find((i) => i.id === route.params.interactionId);
    if (interaction) {
      setFormData({
        contactId: interaction.contactId,
        type: interaction.type,
        date: interaction.date,
        notes: interaction.notes,
      });
      setInitialLoading(false);
    }
  }, [interactions, route.params.interactionId]);

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
      await updateInteraction(user.uid, route.params.interactionId, {
        contactId: formData.contactId,
        type: formData.type,
        date: formData.date,
        notes: formData.notes.trim(),
      });

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update interaction');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Interaction',
      'Are you sure you want to delete this interaction? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setDeleting(true);
            try {
              await deleteInteraction(user.uid, route.params.interactionId);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete interaction');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const selectedContact = contacts.find((c) => c.id === formData.contactId);
  const interactionTypes = Object.values(InteractionType);

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading interaction...</Text>
      </View>
    );
  }

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
              <View style={styles.typeIconContainer}>
                {type === InteractionType.MEETING && <Ionicons name="people-outline" size={20} color={formData.type === type ? '#fff' : '#94a3b8'} />}
                {type === InteractionType.CALL && <Ionicons name="call-outline" size={20} color={formData.type === type ? '#fff' : '#94a3b8'} />}
                {type === InteractionType.EMAIL && <Ionicons name="mail-outline" size={20} color={formData.type === type ? '#fff' : '#94a3b8'} />}
                {type === InteractionType.COFFEE && <Ionicons name="cafe-outline" size={20} color={formData.type === type ? '#fff' : '#94a3b8'} />}
                {type === InteractionType.EVENT && <Ionicons name="calendar-outline" size={20} color={formData.type === type ? '#fff' : '#94a3b8'} />}
                {type === InteractionType.OTHER && <Ionicons name="document-text-outline" size={20} color={formData.type === type ? '#fff' : '#94a3b8'} />}
              </View>
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
              {deleting ? 'Deleting...' : 'Delete Interaction'}
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
  typeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
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
});
