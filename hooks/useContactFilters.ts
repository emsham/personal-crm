import { useMemo, useState, useCallback } from 'react';
import { Contact } from '../types';

interface ContactFilters {
  searchQuery: string;
  statusFilter: Contact['status'] | 'all';
  tagFilter: string;
  filteredContacts: Contact[];
  activeFiltersCount: number;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: Contact['status'] | 'all') => void;
  setTagFilter: (tag: string) => void;
  clearFilters: () => void;
}

export const useContactFilters = (contacts: Contact[]): ContactFilters => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Contact['status'] | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = searchQuery === '' ||
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesTag = tagFilter === 'all' || c.tags.includes(tagFilter);

      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [contacts, searchQuery, statusFilter, tagFilter]);

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (tagFilter !== 'all' ? 1 : 0);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setTagFilter('all');
  }, []);

  return {
    searchQuery,
    statusFilter,
    tagFilter,
    filteredContacts,
    activeFiltersCount,
    setSearchQuery,
    setStatusFilter,
    setTagFilter,
    clearFilters,
  };
};
