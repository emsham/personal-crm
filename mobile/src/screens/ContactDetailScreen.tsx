import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextInput,
  Alert,
  Clipboard,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { RouteProp, useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToContacts, subscribeToInteractions, updateContact, deleteContact } from '../services/firestoreService';
import type { Contact, Interaction, ImportantDate } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

export const ContactDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'ContactDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const { contactId } = route.params;
  const { user } = useAuth();
  const [contact, setContact] = useState<Contact | null>(null);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRelatedPicker, setShowRelatedPicker] = useState(false);
  const [editedContact, setEditedContact] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    position: string;
    tags: string;
    notes: string;
    birthday: string;
    importantDates: ImportantDate[];
    relatedContactIds: string[];
  }>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    tags: '',
    notes: '',
    birthday: '',
    importantDates: [],
    relatedContactIds: [],
  });
  const [newImportantDate, setNewImportantDate] = useState({ label: '', date: '' });
  const [relatedSearchQuery, setRelatedSearchQuery] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copiedAnim = useRef(new Animated.Value(0)).current;

  const copyToClipboard = (text: string, field: string) => {
    Clipboard.setString(text);
    setCopiedField(field);

    // Animate in
    Animated.spring(copiedAnim, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();

    // Animate out after delay
    setTimeout(() => {
      Animated.timing(copiedAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setCopiedField(null));
    }, 1500);
  };

  const toggleEditMode = useCallback((editing: boolean) => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    setIsEditing(editing);
  }, []);

  // Only subscribe when screen is focused
  useEffect(() => {
    if (!user || !isFocused) return;

    const unsubContacts = subscribeToContacts(user.uid, (contacts) => {
      setAllContacts(contacts);
      const found = contacts.find((c) => c.id === contactId);
      setContact(found || null);
    });

    const unsubInteractions = subscribeToInteractions(user.uid, (allInteractions) => {
      const filtered = allInteractions.filter((i) => i.contactId === contactId);
      setInteractions(filtered);
    });

    return () => {
      unsubContacts();
      unsubInteractions();
    };
  }, [user, contactId, isFocused]);

  // Sync editedContact when contact changes (but only when not editing)
  useEffect(() => {
    if (contact && !isEditing) {
      setEditedContact({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        position: contact.position,
        tags: contact.tags.join(', '),
        notes: contact.notes,
        birthday: contact.birthday || '',
        importantDates: contact.importantDates || [],
        relatedContactIds: contact.relatedContactIds || [],
      });
    }
  }, [contact, isEditing]);

  // Get related contacts data
  const relatedContacts = allContacts.filter((c) => contact?.relatedContactIds?.includes(c.id));

  const handleAddImportantDate = () => {
    if (!newImportantDate.label.trim() || !newImportantDate.date) return;
    const newDate: ImportantDate = {
      id: Date.now().toString(),
      label: newImportantDate.label.trim(),
      date: newImportantDate.date, // MM-DD format
    };
    setEditedContact({
      ...editedContact,
      importantDates: [...editedContact.importantDates, newDate],
    });
    setNewImportantDate({ label: '', date: '' });
  };

  const handleRemoveImportantDate = (dateId: string) => {
    setEditedContact({
      ...editedContact,
      importantDates: editedContact.importantDates.filter((d) => d.id !== dateId),
    });
  };

  const handleSaveContact = async () => {
    if (!user || !contact) return;

    setSaving(true);
    try {
      const updates: Partial<Contact> = {
        firstName: editedContact.firstName.trim(),
        lastName: editedContact.lastName.trim(),
        email: editedContact.email.trim(),
        phone: editedContact.phone.trim(),
        company: editedContact.company.trim(),
        position: editedContact.position.trim(),
        tags: editedContact.tags.split(',').map((t) => t.trim()).filter((t) => t),
        notes: editedContact.notes.trim(),
        importantDates: editedContact.importantDates,
        relatedContactIds: editedContact.relatedContactIds,
      };
      if (editedContact.birthday) {
        updates.birthday = editedContact.birthday;
      }
      await updateContact(user.uid, contact.id, updates);
      toggleEditMode(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = () => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this contact and all their data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user || !contact) return;
            try {
              await deleteContact(user.uid, contact.id);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete contact');
            }
          },
        },
      ]
    );
  };

  if (!contact) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const handleCall = () => {
    if (contact.phone) {
      Linking.openURL(`tel:${contact.phone}`);
    }
  };

  const handleEmail = () => {
    if (contact.email) {
      Linking.openURL(`mailto:${contact.email}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {/* Edit button in top right when not editing */}
        {!isEditing && (
          <TouchableOpacity style={styles.editButtonFloat} onPress={() => toggleEditMode(true)}>
            <Text style={styles.editButtonFloatText}>Edit</Text>
          </TouchableOpacity>
        )}

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {contact.firstName[0]}{contact.lastName[0]}
          </Text>
        </View>
        {isEditing ? (
          <View style={styles.editNameRow}>
            <TextInput
              style={styles.editNameInput}
              placeholder="First Name"
              placeholderTextColor="#64748b"
              value={editedContact.firstName}
              onChangeText={(text) => setEditedContact({ ...editedContact, firstName: text })}
            />
            <TextInput
              style={styles.editNameInput}
              placeholder="Last Name"
              placeholderTextColor="#64748b"
              value={editedContact.lastName}
              onChangeText={(text) => setEditedContact({ ...editedContact, lastName: text })}
            />
          </View>
        ) : (
          <Text style={styles.name}>
            {contact.firstName} {contact.lastName}
          </Text>
        )}
        {isEditing ? (
          <View style={styles.editFieldsContainer}>
            <TextInput
              style={styles.editInput}
              placeholder="Position"
              placeholderTextColor="#64748b"
              value={editedContact.position}
              onChangeText={(text) => setEditedContact({ ...editedContact, position: text })}
            />
            <TextInput
              style={styles.editInput}
              placeholder="Company"
              placeholderTextColor="#64748b"
              value={editedContact.company}
              onChangeText={(text) => setEditedContact({ ...editedContact, company: text })}
            />
          </View>
        ) : (
          <Text style={styles.position}>
            {contact.position}{contact.position && contact.company ? ' at ' : ''}{contact.company}
          </Text>
        )}
        <View style={[styles.statusBadge, styles[`status_${contact.status}`]]}>
          <Text style={styles.statusText}>{contact.status}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
          <View style={styles.actionIconContainer}>
            <Ionicons name="call-outline" size={20} color="#3b82f6" />
          </View>
          <Text style={styles.actionLabel}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleEmail}>
          <View style={styles.actionIconContainer}>
            <Ionicons name="mail-outline" size={20} color="#3b82f6" />
          </View>
          <Text style={styles.actionLabel}>Email</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('LogInteraction', { contactId })}>
          <View style={styles.actionIconContainer}>
            <Ionicons name="chatbubble-outline" size={20} color="#3b82f6" />
          </View>
          <Text style={styles.actionLabel}>Log</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AddTask', { contactId })}>
          <View style={styles.actionIconContainer}>
            <Ionicons name="checkbox-outline" size={20} color="#3b82f6" />
          </View>
          <Text style={styles.actionLabel}>Task</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Info</Text>
        <View style={styles.infoCard}>
          {isEditing ? (
            <>
              <View style={styles.editInfoRow}>
                <View style={styles.editInfoLabelRow}>
                  <Ionicons name="mail-outline" size={16} color="#64748b" />
                  <Text style={styles.infoLabel}>Email</Text>
                </View>
                <TextInput
                  style={styles.editInfoInput}
                  placeholder="Email address"
                  placeholderTextColor="#64748b"
                  value={editedContact.email}
                  onChangeText={(text) => setEditedContact({ ...editedContact, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.editInfoRow}>
                <View style={styles.editInfoLabelRow}>
                  <Ionicons name="call-outline" size={16} color="#64748b" />
                  <Text style={styles.infoLabel}>Phone</Text>
                </View>
                <TextInput
                  style={styles.editInfoInput}
                  placeholder="Phone number"
                  placeholderTextColor="#64748b"
                  value={editedContact.phone}
                  onChangeText={(text) => setEditedContact({ ...editedContact, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={[styles.editInfoRow, styles.editInfoRowLast]}>
                <View style={styles.editInfoLabelRow}>
                  <Ionicons name="gift-outline" size={16} color="#64748b" />
                  <Text style={styles.infoLabel}>Birthday</Text>
                </View>
                <TextInput
                  style={styles.editInfoInput}
                  placeholder="MM-DD"
                  placeholderTextColor="#64748b"
                  value={editedContact.birthday}
                  onChangeText={(text) => setEditedContact({ ...editedContact, birthday: text })}
                />
              </View>
            </>
          ) : (
            <>
              {!contact.email && !contact.phone && !contact.birthday ? (
                <View style={styles.emptyInfoContainer}>
                  <Ionicons name="information-circle-outline" size={24} color="#475569" />
                  <Text style={styles.emptyInfoText}>No contact info recorded</Text>
                  <Text style={styles.emptyInfoHint}>Tap Edit to add email, phone, or birthday</Text>
                </View>
              ) : (
                <>
                  {contact.email && (
                    <TouchableOpacity
                      style={[styles.infoRow, !contact.phone && !contact.birthday && styles.infoRowLast]}
                      onPress={() => copyToClipboard(contact.email!, 'email')}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.infoIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                        <Ionicons name="mail-outline" size={18} color="#3b82f6" />
                      </View>
                      <Text style={styles.infoValue}>{contact.email}</Text>
                      {copiedField === 'email' && (
                        <Animated.View
                          style={[
                            styles.copiedBadge,
                            {
                              opacity: copiedAnim,
                              transform: [
                                { scale: copiedAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.8, 1],
                                })},
                              ],
                            },
                          ]}
                        >
                          <Ionicons name="checkmark" size={12} color="#fff" style={{ marginRight: 4 }} />
                          <Text style={styles.copiedText}>Copied</Text>
                        </Animated.View>
                      )}
                    </TouchableOpacity>
                  )}
                  {contact.phone && (
                    <TouchableOpacity
                      style={[styles.infoRow, !contact.birthday && styles.infoRowLast]}
                      onPress={() => copyToClipboard(contact.phone!, 'phone')}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.infoIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                        <Ionicons name="call-outline" size={18} color="#22c55e" />
                      </View>
                      <Text style={styles.infoValue}>{contact.phone}</Text>
                      {copiedField === 'phone' && (
                        <Animated.View
                          style={[
                            styles.copiedBadge,
                            {
                              opacity: copiedAnim,
                              transform: [
                                { scale: copiedAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.8, 1],
                                })},
                              ],
                            },
                          ]}
                        >
                          <Ionicons name="checkmark" size={12} color="#fff" style={{ marginRight: 4 }} />
                          <Text style={styles.copiedText}>Copied</Text>
                        </Animated.View>
                      )}
                    </TouchableOpacity>
                  )}
                  {contact.birthday && (
                    <View style={[styles.infoRow, styles.infoRowLast]}>
                      <View style={[styles.infoIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                        <Ionicons name="gift-outline" size={18} color="#f59e0b" />
                      </View>
                      <Text style={styles.infoValue}>{contact.birthday}</Text>
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </View>
      </View>

      {(isEditing || contact.tags.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          {isEditing ? (
            <TextInput
              style={styles.editTagsInput}
              placeholder="Tags (comma separated)"
              placeholderTextColor="#64748b"
              value={editedContact.tags}
              onChangeText={(text) => setEditedContact({ ...editedContact, tags: text })}
            />
          ) : (
            <View style={styles.tagsContainer}>
              {contact.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {(isEditing || contact.notes) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          {isEditing ? (
            <TextInput
              style={styles.editNotesInput}
              placeholder="Notes"
              placeholderTextColor="#64748b"
              value={editedContact.notes}
              onChangeText={(text) => setEditedContact({ ...editedContact, notes: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          ) : (
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{contact.notes}</Text>
            </View>
          )}
        </View>
      )}

      {/* Important Dates Section */}
      {(isEditing || (contact.importantDates && contact.importantDates.length > 0)) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Important Dates</Text>
          {isEditing ? (
            <View style={styles.importantDatesContainer}>
              {/* Existing dates */}
              {editedContact.importantDates.map((date) => (
                <View key={date.id} style={styles.importantDateItem}>
                  <View style={styles.importantDateInfo}>
                    <Text style={styles.importantDateLabel}>{date.label}</Text>
                    <Text style={styles.importantDateValue}>{date.date}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeImportantDateButton}
                    onPress={() => handleRemoveImportantDate(date.id)}
                  >
                    <Text style={styles.removeImportantDateText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {/* Add new date form */}
              <View style={styles.addImportantDateForm}>
                <TextInput
                  style={styles.importantDateInput}
                  placeholder="Label (e.g., Anniversary)"
                  placeholderTextColor="#64748b"
                  value={newImportantDate.label}
                  onChangeText={(text) => setNewImportantDate({ ...newImportantDate, label: text })}
                />
                <View style={styles.addDateRow}>
                  <TextInput
                    style={[styles.importantDateInput, styles.dateInput]}
                    placeholder="MM-DD"
                    placeholderTextColor="#64748b"
                    value={newImportantDate.date}
                    onChangeText={(text) => setNewImportantDate({ ...newImportantDate, date: text })}
                  />
                  <TouchableOpacity style={styles.addDateButton} onPress={handleAddImportantDate}>
                    <Text style={styles.addDateButtonText}>+ Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.importantDatesContainer}>
              {contact.importantDates?.map((date) => (
                <View key={date.id} style={styles.importantDateItemView}>
                  <Text style={styles.importantDateIcon}>⭐</Text>
                  <Text style={styles.importantDateLabel}>{date.label}</Text>
                  <Text style={styles.importantDateValue}>{date.date}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Related Contacts Section */}
      {(isEditing || relatedContacts.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Linked Contacts</Text>
          {isEditing ? (
            <View style={styles.relatedContactsContainer}>
              {/* Currently linked contacts */}
              {editedContact.relatedContactIds.map((id) => {
                const relatedContact = allContacts.find((c) => c.id === id);
                return relatedContact ? (
                  <View key={id} style={styles.linkedContactItem}>
                    <TouchableOpacity
                      style={styles.linkedContactInfo}
                      onPress={() => navigation.navigate('ContactDetail', { contactId: id })}
                    >
                      <View style={styles.linkedContactAvatar}>
                        <Text style={styles.linkedContactAvatarText}>
                          {relatedContact.firstName[0]}{relatedContact.lastName[0]}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.linkedContactName}>
                          {relatedContact.firstName} {relatedContact.lastName}
                        </Text>
                        {relatedContact.company && (
                          <Text style={styles.linkedContactCompany}>{relatedContact.company}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.unlinkButton}
                      onPress={() =>
                        setEditedContact({
                          ...editedContact,
                          relatedContactIds: editedContact.relatedContactIds.filter((rid) => rid !== id),
                        })
                      }
                    >
                      <Text style={styles.unlinkButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ) : null;
              })}

              {/* Add new link button */}
              <TouchableOpacity
                style={styles.addLinkButton}
                onPress={() => setShowRelatedPicker(!showRelatedPicker)}
              >
                <Text style={styles.addLinkButtonText}>
                  {showRelatedPicker ? '− Cancel' : '+ Link Contact'}
                </Text>
              </TouchableOpacity>

              {/* Contact picker */}
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
                    style={styles.relatedPickerList}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    {allContacts
                      .filter((c) => {
                        if (c.id === contactId) return false;
                        if (editedContact.relatedContactIds.includes(c.id)) return false;
                        if (relatedSearchQuery) {
                          const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
                          return fullName.includes(relatedSearchQuery.toLowerCase());
                        }
                        return true;
                      })
                      .map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          style={styles.relatedPickerItem}
                          onPress={() => {
                            setEditedContact({
                              ...editedContact,
                              relatedContactIds: [...editedContact.relatedContactIds, c.id],
                            });
                            setShowRelatedPicker(false);
                            setRelatedSearchQuery('');
                          }}
                        >
                          <View style={styles.linkedContactAvatar}>
                            <Text style={styles.linkedContactAvatarText}>
                              {c.firstName[0]}{c.lastName[0]}
                            </Text>
                          </View>
                          <View style={styles.relatedPickerItemInfo}>
                            <Text style={styles.relatedPickerItemText}>
                              {c.firstName} {c.lastName}
                            </Text>
                            {c.company && (
                              <Text style={styles.relatedPickerItemCompany}>{c.company}</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    {allContacts.filter((c) => {
                      if (c.id === contactId) return false;
                      if (editedContact.relatedContactIds.includes(c.id)) return false;
                      if (relatedSearchQuery) {
                        const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
                        return fullName.includes(relatedSearchQuery.toLowerCase());
                      }
                      return true;
                    }).length === 0 && (
                      <Text style={styles.noContactsText}>
                        {relatedSearchQuery ? 'No matching contacts' : 'No contacts available to link'}
                      </Text>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.relatedContactsContainer}>
              {relatedContacts.map((relatedContact) => (
                <TouchableOpacity
                  key={relatedContact.id}
                  style={styles.linkedContactItemView}
                  onPress={() => navigation.navigate('ContactDetail', { contactId: relatedContact.id })}
                >
                  <View style={styles.linkedContactAvatar}>
                    <Text style={styles.linkedContactAvatarText}>
                      {relatedContact.firstName[0]}{relatedContact.lastName[0]}
                    </Text>
                  </View>
                  <View style={styles.linkedContactViewInfo}>
                    <Text style={styles.linkedContactName}>
                      {relatedContact.firstName} {relatedContact.lastName}
                    </Text>
                    {relatedContact.company && (
                      <Text style={styles.linkedContactCompany}>{relatedContact.company}</Text>
                    )}
                  </View>
                  <Text style={styles.linkedContactArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Edit mode action buttons */}
      {isEditing && (
        <View style={styles.editActionsContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => toggleEditMode(false)}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSaveContact}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isEditing && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Interactions</Text>
          {interactions.length === 0 ? (
            <Text style={styles.emptyText}>No interactions yet</Text>
          ) : (
            interactions.slice(0, 10).map((interaction) => (
              <TouchableOpacity
                key={interaction.id}
                style={styles.interactionCard}
                onPress={() => navigation.navigate('EditInteraction', { interactionId: interaction.id })}
              >
                <View style={styles.interactionHeader}>
                  <Text style={styles.interactionType}>{interaction.type}</Text>
                  <View style={styles.interactionHeaderRight}>
                    <Text style={styles.interactionDate}>
                      {new Date(interaction.date).toLocaleDateString()}
                    </Text>
                    <Text style={styles.editHint}>Tap to edit</Text>
                  </View>
                </View>
                {interaction.notes && (
                  <Text style={styles.interactionNotes}>{interaction.notes}</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* Danger Zone - Delete at bottom */}
      {isEditing && (
        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteContact}>
            <Text style={styles.deleteButtonText}>Delete Contact</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 50,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    position: 'relative',
  },
  editButtonFloat: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  editButtonFloatText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  position: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 4,
  },
  statusBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
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
    fontSize: 14,
    color: '#fff',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    gap: 24,
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  emptyInfoContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyInfoText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 8,
  },
  emptyInfoHint: {
    color: '#475569',
    fontSize: 13,
    marginTop: 4,
  },
  copiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  copiedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  editInfoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  editInfoRowLast: {
    borderBottomWidth: 0,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    color: '#3b82f6',
    fontSize: 14,
  },
  notesCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  notesText: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 22,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  interactionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  interactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  interactionType: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  interactionDate: {
    color: '#64748b',
    fontSize: 13,
  },
  interactionHeaderRight: {
    alignItems: 'flex-end',
  },
  editHint: {
    color: '#3b82f6',
    fontSize: 11,
    marginTop: 2,
  },
  interactionNotes: {
    color: '#e2e8f0',
    fontSize: 14,
  },
  editActionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
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
  saveButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#3b82f6',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dangerZone: {
    margin: 16,
    marginTop: 24,
    marginBottom: 40,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  dangerZoneTitle: {
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
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  editNameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  editNameInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
    textAlign: 'center',
  },
  editFieldsContainer: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  editInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
    textAlign: 'center',
  },
  editInfoRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  editInfoInput: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  editTagsInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  editNotesInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 100,
  },
  // Important Dates styles
  importantDatesContainer: {
    gap: 8,
  },
  importantDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  importantDateItemView: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  importantDateInfo: {
    flex: 1,
  },
  importantDateIcon: {
    fontSize: 16,
  },
  importantDateLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  importantDateValue: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  removeImportantDateButton: {
    padding: 8,
  },
  removeImportantDateText: {
    color: '#ef4444',
    fontSize: 20,
    fontWeight: '600',
  },
  addImportantDateForm: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    gap: 8,
  },
  importantDateInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  addDateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInput: {
    flex: 1,
  },
  addDateButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addDateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Related Contacts styles
  relatedContactsContainer: {
    gap: 8,
  },
  linkedContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  linkedContactItemView: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
  },
  linkedContactInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkedContactViewInfo: {
    flex: 1,
  },
  linkedContactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  linkedContactAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  linkedContactName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  linkedContactCompany: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  linkedContactArrow: {
    color: '#64748b',
    fontSize: 16,
  },
  unlinkButton: {
    padding: 8,
  },
  unlinkButtonText: {
    color: '#ef4444',
    fontSize: 20,
    fontWeight: '600',
  },
  addLinkButton: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addLinkButtonText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '500',
  },
  relatedPickerContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
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
  relatedPickerList: {
    maxHeight: 200,
  },
  relatedPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  relatedPickerItemInfo: {
    flex: 1,
  },
  relatedPickerItemText: {
    color: '#fff',
    fontSize: 14,
  },
  relatedPickerItemCompany: {
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
});
