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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { addContact, subscribeToContacts } from '../services/firestoreService';
import type { Contact } from '../types';

export const AddContactScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showRelatedPicker, setShowRelatedPicker] = useState(false);
  const [selectedRelatedIds, setSelectedRelatedIds] = useState<string[]>([]);
  const [relatedSearchQuery, setRelatedSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    tags: '',
    notes: '',
    birthday: '',
  });

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToContacts(user.uid, setContacts);
    return unsubscribe;
  }, [user]);

  const handleSubmit = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      Alert.alert('Error', 'First and last name are required');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const newContact: Omit<Contact, 'id'> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        company: formData.company.trim(),
        position: formData.position.trim(),
        tags: formData.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag !== ''),
        notes: formData.notes.trim(),
        avatar: `https://picsum.photos/seed/${formData.firstName}${formData.lastName}/200`,
        status: 'active',
        lastContacted: null,
        nextFollowUp: null,
        relatedContactIds: selectedRelatedIds,
        birthday: formData.birthday || undefined,
      };

      await addContact(user.uid, newContact);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Basic Info</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="First Name *"
            placeholderTextColor="#64748b"
            value={formData.firstName}
            onChangeText={(text) => setFormData({ ...formData, firstName: text })}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Last Name *"
            placeholderTextColor="#64748b"
            value={formData.lastName}
            onChangeText={(text) => setFormData({ ...formData, lastName: text })}
          />
        </View>

        <Text style={styles.sectionTitle}>Work</Text>
        <TextInput
          style={styles.input}
          placeholder="Company"
          placeholderTextColor="#64748b"
          value={formData.company}
          onChangeText={(text) => setFormData({ ...formData, company: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Position"
          placeholderTextColor="#64748b"
          value={formData.position}
          onChangeText={(text) => setFormData({ ...formData, position: text })}
        />

        <Text style={styles.sectionTitle}>Contact</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#64748b"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Phone"
          placeholderTextColor="#64748b"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          keyboardType="phone-pad"
        />

        <Text style={styles.sectionTitle}>Birthday</Text>
        <TextInput
          style={styles.input}
          placeholder="MM-DD (e.g., 05-15 for May 15)"
          placeholderTextColor="#64748b"
          value={formData.birthday}
          onChangeText={(text) => setFormData({ ...formData, birthday: text })}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />

        <Text style={styles.sectionTitle}>Additional</Text>
        <TextInput
          style={styles.input}
          placeholder="Tags (comma separated)"
          placeholderTextColor="#64748b"
          value={formData.tags}
          onChangeText={(text) => setFormData({ ...formData, tags: text })}
        />

        <Text style={styles.sectionTitle}>Related Contacts</Text>
        <TouchableOpacity
          style={styles.relatedPicker}
          onPress={() => setShowRelatedPicker(!showRelatedPicker)}
        >
          <Text style={styles.relatedPickerText}>
            {selectedRelatedIds.length > 0
              ? `${selectedRelatedIds.length} contact(s) linked`
              : 'Link existing contacts (optional)'}
          </Text>
        </TouchableOpacity>

        {selectedRelatedIds.length > 0 && (
          <View style={styles.selectedRelatedContainer}>
            {selectedRelatedIds.map((id) => {
              const contact = contacts.find((c) => c.id === id);
              return contact ? (
                <TouchableOpacity
                  key={id}
                  style={styles.selectedRelatedTag}
                  onPress={() =>
                    setSelectedRelatedIds(selectedRelatedIds.filter((rid) => rid !== id))
                  }
                >
                  <View style={styles.relatedAvatar}>
                    <Text style={styles.relatedAvatarText}>
                      {contact.firstName[0]}{contact.lastName[0]}
                    </Text>
                  </View>
                  <Text style={styles.selectedRelatedName}>{contact.firstName}</Text>
                  <Text style={styles.removeRelated}>×</Text>
                </TouchableOpacity>
              ) : null;
            })}
          </View>
        )}

        {showRelatedPicker && (
          <View style={styles.relatedPickerContainer}>
            <TextInput
              style={styles.relatedSearchInput}
              placeholder="Search contacts..."
              placeholderTextColor="#64748b"
              value={relatedSearchQuery}
              onChangeText={setRelatedSearchQuery}
              autoFocus
            />
            <ScrollView
              style={styles.relatedList}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {contacts
                .filter((c) => {
                  if (selectedRelatedIds.includes(c.id)) return false;
                  if (relatedSearchQuery) {
                    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
                    return fullName.includes(relatedSearchQuery.toLowerCase());
                  }
                  return true;
                })
                .map((contact) => (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.relatedItem}
                    onPress={() => {
                      setSelectedRelatedIds([...selectedRelatedIds, contact.id]);
                      setShowRelatedPicker(false);
                      setRelatedSearchQuery('');
                    }}
                  >
                    <View style={styles.relatedAvatar}>
                      <Text style={styles.relatedAvatarText}>
                        {contact.firstName[0]}{contact.lastName[0]}
                      </Text>
                    </View>
                    <View style={styles.relatedItemInfo}>
                      <Text style={styles.relatedItemText}>
                        {contact.firstName} {contact.lastName}
                      </Text>
                      {contact.company && (
                        <Text style={styles.relatedItemCompany}>{contact.company}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              {contacts.filter((c) => {
                if (selectedRelatedIds.includes(c.id)) return false;
                if (relatedSearchQuery) {
                  const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
                  return fullName.includes(relatedSearchQuery.toLowerCase());
                }
                return true;
              }).length === 0 && (
                <Text style={styles.noContactsText}>
                  {relatedSearchQuery ? 'No matching contacts' : 'No contacts available'}
                </Text>
              )}
            </ScrollView>
          </View>
        )}

        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Notes"
          placeholderTextColor="#64748b"
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          multiline
          numberOfLines={4}
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
              {loading ? 'Saving...' : 'Save Contact'}
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
  row: {
    flexDirection: 'row',
    gap: 12,
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
  halfInput: {
    flex: 1,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  relatedPicker: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  relatedPickerText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  selectedRelatedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  selectedRelatedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    gap: 6,
  },
  selectedRelatedName: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '500',
  },
  removeRelated: {
    color: '#a78bfa',
    fontSize: 18,
    marginLeft: 2,
  },
  relatedPickerContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  relatedSearchInput: {
    backgroundColor: '#0f172a',
    padding: 12,
    fontSize: 14,
    color: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  relatedList: {
    maxHeight: 200,
  },
  relatedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  relatedItemInfo: {
    flex: 1,
  },
  relatedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  relatedAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  relatedItemText: {
    color: '#fff',
    fontSize: 14,
  },
  relatedItemCompany: {
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
});
