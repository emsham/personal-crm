import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToContacts } from '../services/firestoreService';
import type { Contact } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

// Memoized contact card to prevent unnecessary re-renders
const ContactCard = memo(({
  item,
  onPress
}: {
  item: Contact;
  onPress: (id: string) => void;
}) => (
  <TouchableOpacity
    style={styles.contactCard}
    onPress={() => onPress(item.id)}
  >
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>
        {item.firstName[0]}{item.lastName[0]}
      </Text>
    </View>
    <View style={styles.contactInfo}>
      <Text style={styles.contactName}>
        {item.firstName} {item.lastName}
      </Text>
      <Text style={styles.contactCompany}>{item.company || item.position}</Text>
      {item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
    <View style={[styles.statusDot, styles[`dot_${item.status}`]]} />
  </TouchableOpacity>
));

// Memoized filter button to prevent unnecessary re-renders
const FilterButton = memo(({
  status,
  isActive,
  onPress,
}: {
  status: 'all' | 'active' | 'drifting' | 'lost';
  isActive: boolean;
  onPress: (status: 'all' | 'active' | 'drifting' | 'lost') => void;
}) => (
  <TouchableOpacity
    style={[styles.filterButton, isActive && styles.filterActive]}
    onPress={() => onPress(status)}
  >
    <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
      {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
    </Text>
  </TouchableOpacity>
));

const FILTER_OPTIONS = ['all', 'active', 'drifting', 'lost'] as const;

export const ContactsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'drifting' | 'lost'>('all');

  // Only subscribe when screen is focused
  useEffect(() => {
    if (!user || !isFocused) return;
    const unsubscribe = subscribeToContacts(user.uid, setContacts);
    return unsubscribe;
  }, [user, isFocused]);

  // Memoize filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesSearch =
        `${contact.firstName} ${contact.lastName} ${contact.company}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contacts, searchQuery, statusFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleContactPress = useCallback((contactId: string) => {
    navigation.navigate('ContactDetail', { contactId });
  }, [navigation]);

  const handleFilterPress = useCallback((status: 'all' | 'active' | 'drifting' | 'lost') => {
    setStatusFilter(status);
  }, []);

  const renderContact = useCallback(({ item }: { item: Contact }) => (
    <ContactCard item={item} onPress={handleContactPress} />
  ), [handleContactPress]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search contacts..."
        placeholderTextColor="#64748b"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((status) => (
          <FilterButton
            key={status}
            status={status}
            isActive={statusFilter === status}
            onPress={handleFilterPress}
          />
        ))}
      </View>

      <FlatList
        data={filteredContacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No contacts found</Text>
        }
        maxToRenderPerBatch={15}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === 'android'}
        windowSize={10}
        initialNumToRender={10}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddContact')}>
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
  searchInput: {
    backgroundColor: '#1e293b',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    color: '#fff',
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
  },
  filterActive: {
    backgroundColor: '#3b82f6',
  },
  filterText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 14,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  contactCompany: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },
  tag: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#3b82f6',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dot_active: {
    backgroundColor: '#22c55e',
  },
  dot_drifting: {
    backgroundColor: '#eab308',
  },
  dot_lost: {
    backgroundColor: '#ef4444',
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
