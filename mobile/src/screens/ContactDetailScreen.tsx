import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToContacts, subscribeToInteractions } from '../services/firestoreService';
import type { Contact, Interaction } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

export const ContactDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'ContactDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { contactId } = route.params;
  const { user } = useAuth();
  const [contact, setContact] = useState<Contact | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);

  useEffect(() => {
    if (!user) return;

    const unsubContacts = subscribeToContacts(user.uid, (contacts) => {
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
  }, [user, contactId]);

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
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {contact.firstName[0]}{contact.lastName[0]}
          </Text>
        </View>
        <Text style={styles.name}>
          {contact.firstName} {contact.lastName}
        </Text>
        <Text style={styles.position}>
          {contact.position}{contact.position && contact.company ? ' at ' : ''}{contact.company}
        </Text>
        <View style={[styles.statusBadge, styles[`status_${contact.status}`]]}>
          <Text style={styles.statusText}>{contact.status}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
          <Text style={styles.actionIcon}>📞</Text>
          <Text style={styles.actionLabel}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleEmail}>
          <Text style={styles.actionIcon}>✉️</Text>
          <Text style={styles.actionLabel}>Email</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('LogInteraction', { contactId })}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionLabel}>Log</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Info</Text>
        <View style={styles.infoCard}>
          {contact.email && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{contact.email}</Text>
            </View>
          )}
          {contact.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{contact.phone}</Text>
            </View>
          )}
          {contact.birthday && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Birthday</Text>
              <Text style={styles.infoValue}>{contact.birthday}</Text>
            </View>
          )}
        </View>
      </View>

      {contact.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsContainer}>
            {contact.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {contact.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.notesCard}>
            <Text style={styles.notesText}>{contact.notes}</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Interactions</Text>
        {interactions.length === 0 ? (
          <Text style={styles.emptyText}>No interactions yet</Text>
        ) : (
          interactions.slice(0, 10).map((interaction) => (
            <View key={interaction.id} style={styles.interactionCard}>
              <View style={styles.interactionHeader}>
                <Text style={styles.interactionType}>{interaction.type}</Text>
                <Text style={styles.interactionDate}>
                  {new Date(interaction.date).toLocaleDateString()}
                </Text>
              </View>
              {interaction.notes && (
                <Text style={styles.interactionNotes}>{interaction.notes}</Text>
              )}
            </View>
          ))
        )}
      </View>
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
  actionIcon: {
    fontSize: 28,
    marginBottom: 4,
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
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
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
  interactionNotes: {
    color: '#e2e8f0',
    fontSize: 14,
  },
});
