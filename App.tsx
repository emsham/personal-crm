
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Filter, ChevronRight, Loader2, CheckSquare, Cake, Star } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ContactList from './components/ContactList';
import ContactDetail from './components/ContactDetail';
import AddContactForm from './components/AddContactForm';
import AuthPage from './components/AuthPage';
import TaskList from './components/TaskList';
import DashboardWidgets from './components/DashboardWidgets';
import { ChatView } from './components/chat';
import { Contact, Interaction, InteractionType, View, Task } from './types';
import { useAuth } from './contexts/AuthContext';
import { useChat } from './contexts/ChatContext';
import {
  subscribeToContacts,
  subscribeToInteractions,
  subscribeToTasks,
  addContact as addContactToFirestore,
  updateContact as updateContactInFirestore,
  deleteContact as deleteContactFromFirestore,
  addInteraction as addInteractionToFirestore,
  updateInteraction as updateInteractionInFirestore,
  deleteInteraction as deleteInteractionFromFirestore,
  addTask as addTaskToFirestore,
  updateTask as updateTaskInFirestore,
  deleteTask as deleteTaskFromFirestore,
} from './services/firestoreService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { setCRMData } = useChat();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentView, setView] = useState<View>(View.DASHBOARD);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Contact['status'] | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [showDashboardWidgets, setShowDashboardWidgets] = useState(false);

  // Subscribe to Firestore data when user is authenticated
  useEffect(() => {
    if (!user) {
      setContacts([]);
      setInteractions([]);
      setTasks([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

    const unsubscribeContacts = subscribeToContacts(user.uid, (contactsData) => {
      setContacts(contactsData);
      setDataLoading(false);
    });

    const unsubscribeInteractions = subscribeToInteractions(user.uid, (interactionsData) => {
      setInteractions(interactionsData);
    });

    const unsubscribeTasks = subscribeToTasks(user.uid, (tasksData) => {
      setTasks(tasksData);
    });

    return () => {
      unsubscribeContacts();
      unsubscribeInteractions();
      unsubscribeTasks();
    };
  }, [user]);

  // Update ChatContext with CRM data for tool execution
  useEffect(() => {
    setCRMData({ contacts, interactions, tasks });
  }, [contacts, interactions, tasks, setCRMData]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach(c => c.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

      // Tag filter
      const matchesTag = tagFilter === 'all' || c.tags.includes(tagFilter);

      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [contacts, searchQuery, statusFilter, tagFilter]);

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (tagFilter !== 'all' ? 1 : 0);

  // Calculate interactions in last 30 days
  const totalInteractionsLast30Days = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return interactions.filter(i => new Date(i.date) >= thirtyDaysAgo).length;
  }, [interactions]);

  // Calculate interaction stats for chart
  const interactionStats = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Array(7).fill(0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    interactions.forEach(i => {
      const date = new Date(i.date);
      if (date >= sevenDaysAgo) {
        counts[date.getDay()]++;
      }
    });

    return days.map((name, i) => ({ name, count: counts[i] }));
  }, [interactions]);

  // Calculate upcoming birthdays and important dates
  const upcomingDates = useMemo(() => {
    const today = new Date();
    const dates: { contact: Contact; label: string; date: string; daysUntil: number; type: 'birthday' | 'important' }[] = [];

    contacts.forEach(contact => {
      if (contact.birthday) {
        const [month, day] = contact.birthday.split('-').map(Number);
        const thisYear = new Date(today.getFullYear(), month - 1, day);
        const nextYear = new Date(today.getFullYear() + 1, month - 1, day);
        const targetDate = thisYear >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) ? thisYear : nextYear;
        const diffTime = targetDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysUntil <= 30) {
          dates.push({
            contact,
            label: 'Birthday',
            date: contact.birthday,
            daysUntil,
            type: 'birthday',
          });
        }
      }

      contact.importantDates?.forEach(importantDate => {
        const [month, day] = importantDate.date.split('-').map(Number);
        const thisYear = new Date(today.getFullYear(), month - 1, day);
        const nextYear = new Date(today.getFullYear() + 1, month - 1, day);
        const targetDate = thisYear >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) ? thisYear : nextYear;
        const diffTime = targetDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysUntil <= 30) {
          dates.push({
            contact,
            label: importantDate.label,
            date: importantDate.date,
            daysUntil,
            type: 'important',
          });
        }
      });
    });

    return dates.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [contacts]);

  const formatDateForDisplay = (mmdd: string) => {
    const [month, day] = mmdd.split('-');
    const date = new Date(2000, parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Analytics data
  const monthlyInteractions = useMemo(() => {
    const months: { [key: string]: number } = {};
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months[key] = 0;
    }

    interactions.forEach(interaction => {
      const d = new Date(interaction.date);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (months[key] !== undefined) {
        months[key]++;
      }
    });

    return Object.entries(months).map(([month, count]) => ({ month, count }));
  }, [interactions]);

  const interactionsByType = useMemo(() => {
    const types: { [key: string]: number } = {};
    interactions.forEach(i => {
      types[i.type] = (types[i.type] || 0) + 1;
    });
    return Object.entries(types)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [interactions]);

  const topContacts = useMemo(() => {
    const contactCounts: { [key: string]: number } = {};
    interactions.forEach(i => {
      contactCounts[i.contactId] = (contactCounts[i.contactId] || 0) + 1;
    });
    return Object.entries(contactCounts)
      .map(([contactId, count]) => {
        const contact = contacts.find(c => c.id === contactId);
        return { contact, count };
      })
      .filter(item => item.contact)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [interactions, contacts]);

  const tagDistribution = useMemo(() => {
    const tags: { [key: string]: number } = {};
    contacts.forEach(c => {
      c.tags.forEach(tag => {
        tags[tag] = (tags[tag] || 0) + 1;
      });
    });
    return Object.entries(tags)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [contacts]);

  const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];

  const handleAddInteraction = async (contactId: string, type: InteractionType, notes: string, date?: string) => {
    if (!user) return;

    const newInteraction: Omit<Interaction, 'id'> = {
      contactId,
      date: date || new Date().toISOString().split('T')[0],
      type,
      notes,
    };

    try {
      await addInteractionToFirestore(user.uid, newInteraction);

      // Update contact status and last contacted date
      await updateContactInFirestore(user.uid, contactId, {
        lastContacted: newInteraction.date,
        status: 'active',
      });
    } catch (error) {
      console.error('Error adding interaction:', error);
    }
  };

  const handleAddContact = async (newContact: Contact) => {
    if (!user) return;

    try {
      const { id, ...contactData } = newContact;
      await addContactToFirestore(user.uid, contactData);
      setView(View.CONTACTS);
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  };

  const handleUpdateContact = async (contactId: string, updates: Partial<Contact>) => {
    if (!user) return;
    try {
      await updateContactInFirestore(user.uid, contactId, updates);
      // Update selected contact if it's the one being edited
      if (selectedContact?.id === contactId) {
        setSelectedContact({ ...selectedContact, ...updates });
      }
    } catch (error) {
      console.error('Error updating contact:', error);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!user) return;
    try {
      await deleteContactFromFirestore(user.uid, contactId);
      setSelectedContact(null);
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  const handleUpdateInteraction = async (interactionId: string, updates: Partial<Interaction>) => {
    if (!user) return;
    try {
      await updateInteractionInFirestore(user.uid, interactionId, updates);
    } catch (error) {
      console.error('Error updating interaction:', error);
    }
  };

  const handleDeleteInteraction = async (interactionId: string) => {
    if (!user) return;
    try {
      await deleteInteractionFromFirestore(user.uid, interactionId);
    } catch (error) {
      console.error('Error deleting interaction:', error);
    }
  };

  const handleAddTask = async (task: Omit<Task, 'id'>) => {
    if (!user) return;
    try {
      await addTaskToFirestore(user.uid, task);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const getNextDueDate = (currentDate: string, frequency: Task['frequency']): string => {
    const date = new Date(currentDate);
    switch (frequency) {
      case 'daily': date.setDate(date.getDate() + 1); break;
      case 'weekly': date.setDate(date.getDate() + 7); break;
      case 'biweekly': date.setDate(date.getDate() + 14); break;
      case 'monthly': date.setMonth(date.getMonth() + 1); break;
      case 'quarterly': date.setMonth(date.getMonth() + 3); break;
      case 'yearly': date.setFullYear(date.getFullYear() + 1); break;
    }
    return date.toISOString().split('T')[0];
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    if (!user) return;
    try {
      const task = tasks.find(t => t.id === taskId);
      await updateTaskInFirestore(user.uid, taskId, { completed });

      // If completing a recurring task, create the next occurrence
      if (completed && task && task.frequency !== 'none' && task.dueDate) {
        const nextDueDate = getNextDueDate(task.dueDate, task.frequency);
        await addTaskToFirestore(user.uid, {
          title: task.title,
          description: task.description,
          contactId: task.contactId,
          dueDate: nextDueDate,
          priority: task.priority,
          frequency: task.frequency,
          completed: false,
        });
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;
    try {
      await deleteTaskFromFirestore(user.uid, taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto text-indigo-600 mb-4" size={48} />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  const renderDashboard = () => (
    <div className="h-full -m-8">
      <ChatView
        contacts={contacts}
        tasks={tasks}
        onShowDashboard={() => setShowDashboardWidgets(true)}
      />
      <DashboardWidgets
        isOpen={showDashboardWidgets}
        onClose={() => setShowDashboardWidgets(false)}
        contacts={contacts}
        tasks={tasks}
        interactions={interactions}
        onSelectContact={(contact) => {
          setShowDashboardWidgets(false);
          setSelectedContact(contact);
          setView(View.CONTACTS);
        }}
        onViewTasks={() => {
          setShowDashboardWidgets(false);
          setView(View.TASKS);
        }}
      />
    </div>
  );

  const renderContacts = () => {
    if (selectedContact) {
      return (
        <ContactDetail
          contact={selectedContact}
          interactions={interactions.filter(i => i.contactId === selectedContact.id)}
          tasks={tasks}
          allContacts={contacts}
          onBack={() => setSelectedContact(null)}
          onSelectContact={setSelectedContact}
          onUpdateContact={handleUpdateContact}
          onDeleteContact={handleDeleteContact}
          onAddInteraction={handleAddInteraction}
          onUpdateInteraction={handleUpdateInteraction}
          onDeleteInteraction={handleDeleteInteraction}
          onAddTask={handleAddTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900">Your Network</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all"
            >
              <Plus size={18} /> New Contact
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search name, company, tags..."
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full md:w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-xl transition-colors relative ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter size={20} />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as Contact['status'] | 'all')}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-w-[140px]"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="drifting">Drifting</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                  Tag
                </label>
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-w-[140px]"
                >
                  <option value="all">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setTagFilter('all');
                  }}
                  className="text-sm text-slate-500 hover:text-slate-700 underline"
                >
                  Clear filters
                </button>
              )}
              <div className="ml-auto text-sm text-slate-500">
                {filteredContacts.length} of {contacts.length} contacts
              </div>
            </div>
          </div>
        )}

        {dataLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Search size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">No contacts found</h3>
            <p className="text-slate-500 mb-4">
              {contacts.length === 0
                ? "You haven't added any contacts yet."
                : "Try adjusting your search or filters."}
            </p>
            {contacts.length === 0 ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold inline-flex items-center gap-2 hover:bg-indigo-700 transition-all"
              >
                <Plus size={18} /> Add Your First Contact
              </button>
            ) : (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setTagFilter('all');
                }}
                className="text-indigo-600 font-bold hover:text-indigo-700"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <ContactList
            contacts={filteredContacts}
            onSelectContact={setSelectedContact}
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar currentView={currentView} setView={(v) => { setView(v); setSelectedContact(null); }} />

      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
            <span>Personal CRM</span>
            <span>/</span>
            <span className="text-indigo-600">{currentView}</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex -space-x-2">
              {contacts.slice(0, 3).map((c, i) => (
                <img key={i} className="w-8 h-8 rounded-full border-2 border-white" src={c.avatar} alt="" />
              ))}
              {contacts.length > 3 && (
                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                  +{contacts.length - 3}
                </div>
              )}
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                user.email?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
          </div>
        </header>

        {currentView === View.DASHBOARD && renderDashboard()}
        {currentView === View.CONTACTS && renderContacts()}
        {currentView === View.TASKS && (
          <TaskList
            tasks={tasks}
            contacts={contacts}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
          />
        )}
        {currentView === View.ANALYTICS && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
              <p className="text-slate-500 mt-1">Insights into your network and interactions</p>
            </div>

            {/* Monthly Interactions Trend */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg text-slate-900 mb-6">Interaction Trend (6 Months)</h3>
              <div className="h-[300px]">
                {interactions.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    No interaction data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyInteractions}>
                      <defs>
                        <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorInteractions)" name="Interactions" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Interaction Types */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg text-slate-900 mb-6">By Interaction Type</h3>
                <div className="h-[250px]">
                  {interactionsByType.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      No interaction data yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={interactionsByType} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <YAxis type="category" dataKey="type" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} width={80} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="count" fill="#6366f1" radius={[0, 8, 8, 0]} name="Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Tag Distribution */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg text-slate-900 mb-6">Contact Tags</h3>
                <div className="h-[250px]">
                  {tagDistribution.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      No tags yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={tagDistribution}
                          dataKey="count"
                          nameKey="tag"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ tag, percent }) => `${tag} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {tagDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Top Contacts */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg text-slate-900 mb-6">Most Contacted</h3>
              {topContacts.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No interaction data yet
                </div>
              ) : (
                <div className="space-y-4">
                  {topContacts.map((item, index) => (
                    <div
                      key={item.contact!.id}
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedContact(item.contact!);
                        setView(View.CONTACTS);
                      }}
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                        {index + 1}
                      </div>
                      <img src={item.contact!.avatar} alt="" className="w-12 h-12 rounded-xl object-cover" />
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">{item.contact!.firstName} {item.contact!.lastName}</h4>
                        <p className="text-sm text-slate-500">{item.contact!.company}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-indigo-600">{item.count}</div>
                        <div className="text-xs text-slate-400">interactions</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {showAddModal && (
        <AddContactForm
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddContact}
          existingContacts={contacts}
        />
      )}
    </div>
  );
};

export default App;
