
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
import { Search, Plus, Filter, Loader2 } from 'lucide-react';
import ContactList from './components/ContactList';
import AddContactForm from './components/AddContactForm';
import AuthPage from './components/AuthPage';
import EmailVerification from './components/EmailVerification';
import { ChatView } from './components/chat';
import { ProtectedRoute, PublicRoute } from './components/auth';
import { LoadingDots, LoadingOverlay } from './components/ui';
import { AppLayout } from './components/layout';

// Lazy-loaded components for code splitting
const ContactDetail = lazy(() => import('./components/ContactDetail'));
const TaskList = lazy(() => import('./components/TaskList'));
const DashboardWidgets = lazy(() => import('./components/DashboardWidgets'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const LandingPage = lazy(() => import('./components/landing').then(m => ({ default: m.LandingPage })));
const AnalyticsPage = lazy(() => import('./components/AnalyticsPage'));
const CalendarMobileCallback = lazy(() => import('./components/CalendarMobileCallback'));

import { Contact, Interaction, InteractionType, Task } from './types';
import { useAuth } from './contexts/AuthContext';
import { useChat } from './contexts/ChatContext';
import { useLLMSettings } from './contexts/LLMSettingsContext';
import { useCalendar } from './contexts/CalendarContext';
import { useFirestoreData, useCRMStats, useContactFilters } from './hooks';
import {
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

// Loading spinner component for Suspense fallback
const LoadingSpinner: React.FC = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0f] z-50">
    <LoadingDots size="lg" />
  </div>
);

const App: React.FC = () => {
  const { user, loading: authLoading, requiresEmailVerification } = useAuth();
  const { setCRMData } = useChat();
  const { currentProviderConfigured, isLoading: llmLoading } = useLLMSettings();
  const { mobileRedirectPending } = useCalendar();
  const navigate = useNavigate();
  const location = useLocation();

  // Use custom hooks for data management
  const { contacts, interactions, tasks, loading: dataLoading } = useFirestoreData(user);
  const { allTags } = useCRMStats(contacts, interactions);
  const {
    searchQuery,
    statusFilter,
    tagFilter,
    filteredContacts,
    activeFiltersCount,
    setSearchQuery,
    setStatusFilter,
    setTagFilter,
    clearFilters,
  } = useContactFilters(contacts);

  // UI state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDashboardWidgets, setShowDashboardWidgets] = useState(false);

  // Update ChatContext with CRM data for tool execution
  useEffect(() => {
    setCRMData({ contacts, interactions, tasks });
  }, [contacts, interactions, tasks, setCRMData]);

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
      navigate('/contacts');
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  };

  const handleUpdateContact = async (contactId: string, updates: Partial<Contact>) => {
    if (!user) return;
    try {
      await updateContactInFirestore(user.uid, contactId, updates);
    } catch (error) {
      console.error('Error updating contact:', error);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!user) return;
    try {
      await deleteContactFromFirestore(user.uid, contactId);
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

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!user) return;
    try {
      await updateTaskInFirestore(user.uid, taskId, updates);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const renderDashboard = () => {
    // Render content with loading overlay on top
    // The overlay fades out smoothly when loading completes
    const content = !currentProviderConfigured ? (
      // If no API key configured, show full dashboard with widgets
      <DashboardWidgets
        isOpen={true}
        onClose={() => {}} // No-op since it's the main view
        contacts={contacts}
        tasks={tasks}
        interactions={interactions}
        onSelectContact={(contact) => {
          navigate(`/contacts/${contact.id}`);
        }}
        onViewTasks={() => {
          navigate('/tasks');
        }}
        fullPage={true}
      />
    ) : (
      // If API key is configured, show tethru AI (ChatView)
      <div className="h-screen -m-4 md:-m-6 lg:-m-8 overflow-hidden">
        <ChatView
          contacts={contacts}
          tasks={tasks}
          onShowDashboard={() => setShowDashboardWidgets(true)}
          onSelectContact={(contact, fromChat) => {
            navigate(`/contacts/${contact.id}`, { state: { fromChat } });
          }}
        />
        <DashboardWidgets
          isOpen={showDashboardWidgets}
          onClose={() => setShowDashboardWidgets(false)}
          contacts={contacts}
          tasks={tasks}
          interactions={interactions}
          onSelectContact={(contact) => {
            setShowDashboardWidgets(false);
            navigate(`/contacts/${contact.id}`);
          }}
          onViewTasks={() => {
            setShowDashboardWidgets(false);
            navigate('/tasks');
          }}
        />
      </div>
    );

    return (
      <>
        {content}
        <LoadingOverlay isLoading={llmLoading} />
      </>
    );
  };

  // Contact detail page wrapper that reads ID from URL
  const ContactDetailPage: React.FC = () => {
    const { contactId } = useParams<{ contactId: string }>();
    const contact = contacts.find(c => c.id === contactId);
    const locationState = location.state as { fromChat?: boolean } | null;
    const fromChat = locationState?.fromChat ?? false;

    if (!contact) {
      return (
        <div className="glass rounded-2xl p-12 text-center">
          <h3 className="text-lg font-bold text-white mb-2">Contact not found</h3>
          <p className="text-slate-400 mb-6">This contact may have been deleted.</p>
          <button
            onClick={() => navigate('/contacts')}
            className="text-violet-400 font-semibold hover:text-violet-300 transition-colors"
          >
            Back to Contacts
          </button>
        </div>
      );
    }

    return (
      <ContactDetail
        contact={contact}
        interactions={interactions.filter(i => i.contactId === contact.id)}
        tasks={tasks}
        allContacts={contacts}
        onBack={() => navigate('/contacts')}
        onBackToChat={() => navigate('/')}
        fromChat={fromChat}
        onSelectContact={(c) => navigate(`/contacts/${c.id}`)}
        onUpdateContact={handleUpdateContact}
        onDeleteContact={async (id) => {
          await handleDeleteContact(id);
          navigate('/contacts');
        }}
        onAddInteraction={handleAddInteraction}
        onUpdateInteraction={handleUpdateInteraction}
        onDeleteInteraction={handleDeleteInteraction}
        onAddTask={handleAddTask}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
      />
    );
  };

  const renderContactsList = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 pl-14 lg:pl-0">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Your Network</h2>
            <p className="text-slate-400 text-sm mt-1">Manage and nurture your professional relationships</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-violet-500 to-cyan-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
            >
              <Plus size={18} /> New Contact
            </button>
            <div className="flex gap-3 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder="Search name, company, tags..."
                  className="pl-10 pr-4 py-2.5 input-dark rounded-xl w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-xl transition-all relative flex-shrink-0 ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/50'
                    : 'glass text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Filter size={20} />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="glass rounded-2xl p-5">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as Contact['status'] | 'all')}
                  className="px-4 py-2.5 input-dark rounded-xl text-sm min-w-[140px]"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="drifting">Drifting</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Tag
                </label>
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="px-4 py-2.5 input-dark rounded-xl text-sm min-w-[140px]"
                >
                  <option value="all">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-violet-400 hover:text-violet-300 font-medium"
                >
                  Clear filters
                </button>
              )}
              <div className="ml-auto text-sm text-slate-500">
                <span className="text-white font-semibold">{filteredContacts.length}</span> of {contacts.length} contacts
              </div>
            </div>
          </div>
        )}

        {dataLoading ? (
          <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0f] z-50">
            <LoadingDots size="lg" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No contacts found</h3>
            <p className="text-slate-400 mb-6">
              {contacts.length === 0
                ? "You haven't added any contacts yet."
                : "Try adjusting your search or filters."}
            </p>
            {contacts.length === 0 ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-violet-500 to-cyan-500 text-white px-5 py-2.5 rounded-xl font-semibold inline-flex items-center gap-2 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
              >
                <Plus size={18} /> Add Your First Contact
              </button>
            ) : (
              <button
                onClick={clearFilters}
                className="text-violet-400 font-semibold hover:text-violet-300 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <ContactList
            contacts={filteredContacts}
            onSelectContact={(contact) => navigate(`/contacts/${contact.id}`)}
          />
        )}
      </div>
    );
  };

  return (
    <>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <AuthPage mode="login" />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <AuthPage mode="signup" />
              </PublicRoute>
            }
          />
          <Route path="/verify-email" element={<EmailVerification />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>{renderDashboard()}</AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts"
            element={
              <ProtectedRoute>
                <AppLayout>{renderContactsList()}</AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts/:contactId"
            element={
              <ProtectedRoute>
                <AppLayout><ContactDetailPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <TaskList
                    tasks={tasks}
                    contacts={contacts}
                    onAddTask={handleAddTask}
                    onUpdateTask={handleUpdateTask}
                    onToggleTask={handleToggleTask}
                    onDeleteTask={handleDeleteTask}
                  />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppLayout><SettingsPage tasks={tasks} contacts={contacts} /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/auth/calendar/callback"
            element={
              <ProtectedRoute>
                {mobileRedirectPending ? (
                  <CalendarMobileCallback />
                ) : (
                  <AppLayout><SettingsPage tasks={tasks} contacts={contacts} /></AppLayout>
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <AnalyticsPage contacts={contacts} interactions={interactions} />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {showAddModal && (
        <AddContactForm
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddContact}
          existingContacts={contacts}
        />
      )}
    </>
  );
};

export default App;
