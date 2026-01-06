
import React, { useState } from 'react';
import { Contact, Interaction, InteractionType, Task, TaskFrequency, ImportantDate } from '../types';
import { Mail, Phone, Calendar, Tag, Plus, MessageSquare, Sparkles, Send, ArrowLeft, Loader2, Users, CheckSquare, Check, Trash2, X, Edit3, Save, Cake, Star, Clock, Bell, Smartphone } from 'lucide-react';
import { generateFollowUpEmail, analyzeRelationship } from '../services/geminiService';

interface ContactDetailProps {
  contact: Contact;
  interactions: Interaction[];
  tasks: Task[];
  allContacts: Contact[];
  onBack: () => void;
  onBackToChat?: () => void;
  fromChat?: boolean;
  onSelectContact: (contact: Contact) => void;
  onUpdateContact: (contactId: string, updates: Partial<Contact>) => void;
  onDeleteContact: (contactId: string) => void;
  onAddInteraction: (contactId: string, type: InteractionType, notes: string, date: string) => void;
  onUpdateInteraction: (interactionId: string, updates: Partial<Interaction>) => void;
  onDeleteInteraction: (interactionId: string) => void;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onToggleTask: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
}

const ContactDetail: React.FC<ContactDetailProps> = ({
  contact,
  interactions,
  tasks,
  allContacts,
  onBack,
  onBackToChat,
  fromChat,
  onSelectContact,
  onUpdateContact,
  onDeleteContact,
  onAddInteraction,
  onUpdateInteraction,
  onDeleteInteraction,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}) => {
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editedContact, setEditedContact] = useState({
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
  });
  const [newImportantDate, setNewImportantDate] = useState({ label: '', date: '' });
  const [hasAnimated, setHasAnimated] = useState(false);

  // Mark as animated after first render to prevent re-animation on updates
  React.useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Sync editedContact when contact prop changes (but only when not editing)
  React.useEffect(() => {
    if (!isEditingContact) {
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
      });
    }
  }, [contact, isEditingContact]);

  const [newInteractionNotes, setNewInteractionNotes] = useState('');
  const [newInteractionDate, setNewInteractionDate] = useState(new Date().toISOString().split('T')[0]);
  const [interactionType, setInteractionType] = useState<InteractionType>(InteractionType.EMAIL);

  const [editingInteractionId, setEditingInteractionId] = useState<string | null>(null);
  const [editedInteraction, setEditedInteraction] = useState<{ type: InteractionType; notes: string; date: string } | null>(null);

  const [aiDraft, setAiDraft] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState({ draft: false, analysis: false });
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    dueDate: '',
    dueTime: '',
    reminderBefore: '' as string | number,
    priority: 'medium' as Task['priority'],
    frequency: 'none' as TaskFrequency,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const reminderOptions = [
    { value: '', label: 'No reminder' },
    { value: 0, label: 'At time of task' },
    { value: 15, label: '15 min before' },
    { value: 30, label: '30 min before' },
    { value: 60, label: '1 hour before' },
    { value: 120, label: '2 hours before' },
  ];

  const relatedContacts = allContacts.filter(c => contact.relatedContactIds.includes(c.id));
  const contactTasks = tasks.filter(t => t.contactId === contact.id);
  const pendingTasks = contactTasks.filter(t => !t.completed);
  const completedTasks = contactTasks.filter(t => t.completed);

  const handleGenerateDraft = async () => {
    setIsLoading(prev => ({ ...prev, draft: true }));
    const draft = await generateFollowUpEmail(contact, "Catching up after a few weeks.");
    setAiDraft(draft || '');
    setIsLoading(prev => ({ ...prev, draft: false }));
  };

  const handleAnalyze = async () => {
    setIsLoading(prev => ({ ...prev, analysis: true }));
    const result = await analyzeRelationship(contact, interactions);
    setAiAnalysis(result);
    setIsLoading(prev => ({ ...prev, analysis: false }));
  };

  const handleSubmitInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInteractionNotes.trim()) return;
    onAddInteraction(contact.id, interactionType, newInteractionNotes, newInteractionDate);
    setNewInteractionNotes('');
    setNewInteractionDate(new Date().toISOString().split('T')[0]);
  };

  const handleSaveContact = () => {
    const updates: Partial<Contact> = {
      firstName: editedContact.firstName,
      lastName: editedContact.lastName,
      email: editedContact.email,
      phone: editedContact.phone,
      company: editedContact.company,
      position: editedContact.position,
      tags: editedContact.tags.split(',').map(t => t.trim()).filter(t => t),
      notes: editedContact.notes,
      importantDates: editedContact.importantDates,
    };
    if (editedContact.birthday) {
      updates.birthday = editedContact.birthday;
    }
    onUpdateContact(contact.id, updates);
    setIsEditingContact(false);
  };

  const handleAddImportantDate = () => {
    if (!newImportantDate.label.trim() || !newImportantDate.date) return;
    const newDate: ImportantDate = {
      id: Date.now().toString(),
      label: newImportantDate.label,
      date: newImportantDate.date.slice(5), // Convert YYYY-MM-DD to MM-DD
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
      importantDates: editedContact.importantDates.filter(d => d.id !== dateId),
    });
  };

  const formatDateForDisplay = (mmdd: string) => {
    const [month, day] = mmdd.split('-');
    const date = new Date(2000, parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getUpcomingInDays = (mmdd: string): number | null => {
    const today = new Date();
    const [month, day] = mmdd.split('-').map(Number);
    const thisYear = new Date(today.getFullYear(), month - 1, day);
    const nextYear = new Date(today.getFullYear() + 1, month - 1, day);

    const targetDate = thisYear >= today ? thisYear : nextYear;
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleEditInteraction = (interaction: Interaction) => {
    setEditingInteractionId(interaction.id);
    setEditedInteraction({
      type: interaction.type,
      notes: interaction.notes,
      date: interaction.date,
    });
  };

  const handleSaveInteraction = () => {
    if (editingInteractionId && editedInteraction) {
      onUpdateInteraction(editingInteractionId, editedInteraction);
      setEditingInteractionId(null);
      setEditedInteraction(null);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    onAddTask({
      title: newTask.title,
      contactId: contact.id,
      dueDate: newTask.dueDate || undefined,
      dueTime: newTask.dueTime || undefined,
      reminderBefore: newTask.reminderBefore !== '' ? Number(newTask.reminderBefore) : undefined,
      priority: newTask.priority,
      frequency: newTask.frequency,
      completed: false,
    });
    setNewTask({ title: '', dueDate: '', dueTime: '', reminderBefore: '', priority: 'medium', frequency: 'none' });
    setShowAddTask(false);
  };

  const frequencyLabels: Record<TaskFrequency, string> = {
    none: 'One-time',
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const isOverdue = (dueDate?: string, dueTime?: string) => {
    if (!dueDate) return false;
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate + 'T00:00:00');

    // If due date is before today, it's overdue
    if (due < today) return true;

    // If due date is today and time is specified, check if time has passed
    if (due.getTime() === today.getTime() && dueTime) {
      const [hours, minutes] = dueTime.split(':').map(Number);
      const dueDateTime = new Date(due);
      dueDateTime.setHours(hours, minutes, 0, 0);
      return dueDateTime < now;
    }

    return false;
  };

  return (
    <div className={`space-y-6 ${!hasAnimated ? 'animate-in fade-in slide-in-from-bottom-4 duration-500' : ''}`}>
      <div className="flex items-center justify-between pl-14 lg:pl-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-slate-400 hover:text-violet-400 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Network</span>
          </button>
          {fromChat && onBackToChat && (
            <button
              onClick={onBackToChat}
              className="flex items-center space-x-2 px-3 py-1.5 text-violet-400 hover:text-white bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-all border border-violet-500/20"
            >
              <MessageSquare size={16} />
              <span className="font-medium text-sm">Return to Chat</span>
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {!isEditingContact ? (
            <button
              onClick={() => setIsEditingContact(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <Edit3 size={16} /> Edit
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsEditingContact(false)}
                className="px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContact}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-cyan-500 rounded-xl shadow-lg shadow-violet-500/25"
              >
                <Save size={16} /> Save
              </button>
            </>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="glass rounded-2xl p-4 flex items-center justify-between border border-red-500/20">
          <span className="text-red-400">Delete this contact and all their data?</span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onDeleteContact(contact.id)}
              className="px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass rounded-3xl p-8">
            {isEditingContact ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="First Name"
                    className="px-4 py-3 input-dark rounded-xl text-sm"
                    value={editedContact.firstName}
                    onChange={e => setEditedContact({ ...editedContact, firstName: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    className="px-4 py-3 input-dark rounded-xl text-sm"
                    value={editedContact.lastName}
                    onChange={e => setEditedContact({ ...editedContact, lastName: e.target.value })}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Position"
                  className="w-full px-4 py-3 input-dark rounded-xl text-sm"
                  value={editedContact.position}
                  onChange={e => setEditedContact({ ...editedContact, position: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Company"
                  className="w-full px-4 py-3 input-dark rounded-xl text-sm"
                  value={editedContact.company}
                  onChange={e => setEditedContact({ ...editedContact, company: e.target.value })}
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-4 py-3 input-dark rounded-xl text-sm"
                  value={editedContact.email}
                  onChange={e => setEditedContact({ ...editedContact, email: e.target.value })}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  className="w-full px-4 py-3 input-dark rounded-xl text-sm"
                  value={editedContact.phone}
                  onChange={e => setEditedContact({ ...editedContact, phone: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Tags (comma separated)"
                  className="w-full px-4 py-3 input-dark rounded-xl text-sm"
                  value={editedContact.tags}
                  onChange={e => setEditedContact({ ...editedContact, tags: e.target.value })}
                />
                <textarea
                  placeholder="Notes"
                  rows={3}
                  className="w-full px-4 py-3 input-dark rounded-xl text-sm resize-none"
                  value={editedContact.notes}
                  onChange={e => setEditedContact({ ...editedContact, notes: e.target.value })}
                />
                <div className="pt-4 border-t border-white/5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                    <Cake size={12} /> Birthday
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 input-dark rounded-xl text-sm"
                    value={editedContact.birthday ? `2000-${editedContact.birthday}` : ''}
                    onChange={e => setEditedContact({ ...editedContact, birthday: e.target.value.slice(5) })}
                  />
                </div>
                <div className="pt-4 border-t border-white/5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                    <Star size={12} /> Important Dates
                  </label>
                  <div className="space-y-2 mb-3">
                    {editedContact.importantDates.map(date => (
                      <div key={date.id} className="flex items-center gap-2 glass-light px-3 py-2 rounded-lg">
                        <span className="text-sm text-slate-300 flex-1">{date.label}</span>
                        <span className="text-xs text-slate-500">{formatDateForDisplay(date.date)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveImportantDate(date.id)}
                          className="text-slate-500 hover:text-red-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Label (e.g., Anniversary)"
                      className="w-full px-4 py-3 input-dark rounded-xl text-sm"
                      value={newImportantDate.label}
                      onChange={e => setNewImportantDate({ ...newImportantDate, label: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <input
                        type="date"
                        className="flex-1 px-4 py-3 input-dark rounded-xl text-sm"
                        value={newImportantDate.date}
                        onChange={e => setNewImportantDate({ ...newImportantDate, date: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={handleAddImportantDate}
                        className="px-4 py-3 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/25 flex-shrink-0"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="h-32 w-32 rounded-3xl mx-auto bg-black shadow-2xl ring-4 ring-white/10 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {contact.firstName?.charAt(0).toUpperCase() || ''}{contact.lastName?.charAt(0).toUpperCase() || ''}
                    </span>
                  </div>
                  {contact.status === 'active' && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/50 border-2 border-dark-900">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white">{contact.firstName} {contact.lastName}</h2>
                <p className="text-violet-400 font-medium">{contact.position} {contact.company && `@ ${contact.company}`}</p>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {contact.tags.map(tag => (
                    <span key={tag} className="px-3 py-1.5 glass-light text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                      <Tag size={10} /> {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-8 space-y-3">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center space-x-3 w-full p-4 glass-light rounded-xl hover:bg-white/10 transition-all group">
                      <Mail className="text-violet-400" size={18} />
                      <span className="text-slate-300 text-sm truncate group-hover:text-white transition-colors">{contact.email}</span>
                    </a>
                  )}
                  {contact.phone && (
                    <div className="flex items-center space-x-3 w-full p-4 glass-light rounded-xl">
                      <Phone className="text-violet-400" size={18} />
                      <span className="text-slate-300 text-sm">{contact.phone}</span>
                    </div>
                  )}
                </div>

                {contact.notes && (
                  <div className="mt-6 pt-6 border-t border-white/5 text-left">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Notes</p>
                    <p className="text-sm text-slate-400">{contact.notes}</p>
                  </div>
                )}

                {(contact.birthday || (contact.importantDates && contact.importantDates.length > 0)) && (
                  <div className="mt-6 pt-6 border-t border-white/5 text-left">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <Calendar size={12} /> Important Dates
                    </p>
                    <div className="space-y-2">
                      {contact.birthday && (
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-500/10 to-violet-500/10 rounded-xl border border-pink-500/20">
                          <div className="flex items-center gap-2">
                            <Cake size={16} className="text-pink-400" />
                            <span className="text-sm font-medium text-slate-300">Birthday</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm text-slate-400">{formatDateForDisplay(contact.birthday)}</span>
                            {(() => {
                              const days = getUpcomingInDays(contact.birthday);
                              if (days === 0) return <span className="block text-xs text-pink-400 font-bold">Today!</span>;
                              if (days && days <= 30) return <span className="block text-xs text-pink-400">in {days} days</span>;
                              return null;
                            })()}
                          </div>
                        </div>
                      )}
                      {contact.importantDates?.map(date => (
                        <div key={date.id} className="flex items-center justify-between p-3 glass-light rounded-xl">
                          <div className="flex items-center gap-2">
                            <Star size={16} className="text-amber-400" />
                            <span className="text-sm font-medium text-slate-300">{date.label}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm text-slate-400">{formatDateForDisplay(date.date)}</span>
                            {(() => {
                              const days = getUpcomingInDays(date.date);
                              if (days === 0) return <span className="block text-xs text-amber-400 font-bold">Today!</span>;
                              if (days && days <= 30) return <span className="block text-xs text-amber-400">in {days} days</span>;
                              return null;
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {relatedContacts.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-white/5">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                      <Users size={14} /> Network Connections
                    </h3>
                    <div className="flex flex-wrap justify-center gap-3">
                      {relatedContacts.map(related => (
                        <button
                          key={related.id}
                          onClick={() => onSelectContact(related)}
                          className="group relative"
                          title={`${related.firstName} ${related.lastName}`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-black ring-2 ring-white/10 group-hover:ring-violet-500/50 group-hover:scale-110 transition-all cursor-pointer flex items-center justify-center">
                            <span className="text-sm font-bold text-white">
                              {related.firstName?.charAt(0).toUpperCase() || ''}{related.lastName?.charAt(0).toUpperCase() || ''}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Relationship AI Analysis */}
          <div className="rounded-3xl p-6 overflow-hidden relative bg-gradient-to-br from-violet-600 to-cyan-600">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Sparkles size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Sparkles size={20} /> Nexus AI Insight
                </h3>
                {aiAnalysis && (
                  <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold text-white">
                    Score: {aiAnalysis.healthScore}/10
                  </div>
                )}
              </div>

              {!aiAnalysis ? (
                <div className="space-y-4">
                  <p className="text-white/80 text-sm">
                    Get an AI-powered analysis of your relationship health and personalized next steps.
                  </p>
                  <button
                    onClick={handleAnalyze}
                    disabled={isLoading.analysis}
                    className="w-full py-3 bg-white text-violet-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-50"
                  >
                    {isLoading.analysis ? <Loader2 className="animate-spin" size={20} /> : "Run Relationship Analysis"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-white/90 text-sm">{aiAnalysis.summary}</p>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-white/60 uppercase">Recommended Next Steps</p>
                    <ul className="space-y-2">
                      {aiAnalysis.nextSteps.map((step: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/90">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/60 mt-1.5 shrink-0" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button onClick={() => setAiAnalysis(null)} className="text-xs text-white/60 hover:text-white underline">Re-analyze</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Tasks, Interactions & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tasks Section */}
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <CheckSquare size={20} className="text-violet-400" /> Tasks
              </h3>
              <button
                onClick={() => setShowAddTask(!showAddTask)}
                className="text-sm font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
              >
                {showAddTask ? <X size={16} /> : <Plus size={16} />}
                {showAddTask ? 'Cancel' : 'Add Task'}
              </button>
            </div>

            {showAddTask && (
              <form onSubmit={handleAddTask} className="mb-4 p-4 glass-light rounded-xl space-y-3">
                <input
                  type="text"
                  placeholder="Task title..."
                  className="w-full px-4 py-3 input-dark rounded-xl text-sm"
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Calendar size={10} /> Due Date
                    </label>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      className="w-full px-3 py-2 input-dark rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Clock size={10} /> Due Time
                    </label>
                    <input
                      type="time"
                      value={newTask.dueTime}
                      onChange={(e) => setNewTask({ ...newTask, dueTime: e.target.value })}
                      className="w-full px-3 py-2 input-dark rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Bell size={10} /> Reminder
                      {newTask.reminderBefore !== '' && (
                        <Smartphone size={10} className="text-violet-400 ml-1" />
                      )}
                    </label>
                    <select
                      className="w-full px-3 py-2 input-dark rounded-xl text-sm"
                      value={newTask.reminderBefore}
                      onChange={e => setNewTask({ ...newTask, reminderBefore: e.target.value === '' ? '' : Number(e.target.value) })}
                    >
                      {reminderOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap items-end">
                  <select
                    className="px-3 py-2 input-dark rounded-xl text-sm"
                    value={newTask.frequency}
                    onChange={e => setNewTask({ ...newTask, frequency: e.target.value as TaskFrequency })}
                  >
                    <option value="none">One-time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  <select
                    className="px-3 py-2 input-dark rounded-xl text-sm"
                    value={newTask.priority}
                    onChange={e => setNewTask({ ...newTask, priority: e.target.value as Task['priority'] })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-violet-500/25">
                    Add Task
                  </button>
                </div>
                {newTask.reminderBefore !== '' && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Smartphone size={11} className="text-violet-400" />
                    Reminder via mobile notification
                  </p>
                )}
              </form>
            )}

            <div className="space-y-2">
              {pendingTasks.length === 0 && completedTasks.length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center">No tasks for this contact yet.</p>
              ) : (
                <>
                  {pendingTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group">
                      <button
                        onClick={() => onToggleTask(task.id, true)}
                        className="w-5 h-5 rounded-lg border-2 border-slate-600 hover:border-violet-500 transition-colors flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white">{task.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-lg border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          {task.frequency && task.frequency !== 'none' && (
                            <span className="text-xs px-2 py-0.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                              {frequencyLabels[task.frequency]}
                            </span>
                          )}
                        </div>
                        {task.dueDate && (
                          <span className={`text-xs ${isOverdue(task.dueDate, task.dueTime) ? 'text-red-400' : 'text-slate-500'}`}>
                            {isOverdue(task.dueDate, task.dueTime) ? 'Overdue: ' : 'Due: '}{task.dueDate}
                            {task.dueTime && ` at ${task.dueTime}`}
                          </span>
                        )}
                      </div>
                      <button onClick={() => onDeleteTask(task.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {completedTasks.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-white/5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Completed</p>
                      {completedTasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-2 opacity-50">
                          <button
                            onClick={() => onToggleTask(task.id, false)}
                            className="w-5 h-5 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0"
                          >
                            <Check size={12} className="text-white" />
                          </button>
                          <span className="text-sm text-slate-400 line-through flex-1">{task.title}</span>
                          <button onClick={() => onDeleteTask(task.id)} className="text-slate-600 hover:text-red-400">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Follow-up Draft Section */}
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Send size={20} className="text-violet-400" /> AI Outreach Draft
              </h3>
              <button
                onClick={handleGenerateDraft}
                disabled={isLoading.draft}
                className="text-sm font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 disabled:opacity-50 transition-colors"
              >
                {isLoading.draft ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                Generate Smart Follow-up
              </button>
            </div>

            {aiDraft ? (
              <div className="space-y-4">
                <textarea
                  className="w-full h-40 p-4 input-dark rounded-2xl text-sm resize-none"
                  value={aiDraft}
                  onChange={(e) => setAiDraft(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => setAiDraft('')} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">Discard</button>
                  <button className="flex-1 py-2.5 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-bold rounded-xl text-sm shadow-lg hover:shadow-violet-500/25 transition-all">Copy to Clipboard</button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center border-2 border-dashed border-white/10 rounded-2xl">
                <MessageSquare className="mx-auto text-slate-600 mb-2" size={32} />
                <p className="text-slate-500 text-sm">Generate a tailored message based on your history.</p>
              </div>
            )}
          </div>

          {/* Interaction Log */}
          <div className="glass rounded-3xl p-6 flex-1">
            <h3 className="font-bold text-lg text-white mb-6 flex items-center gap-2">
              <Calendar size={20} className="text-violet-400" /> Interaction History
            </h3>

            <form onSubmit={handleSubmitInteraction} className="mb-8">
              <div className="glass-light p-4 rounded-2xl">
                <div className="flex gap-3 mb-3 flex-wrap">
                  <select
                    className="input-dark rounded-xl px-3 py-2 text-xs font-bold"
                    value={interactionType}
                    onChange={(e) => setInteractionType(e.target.value as InteractionType)}
                  >
                    {Object.values(InteractionType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    className="input-dark rounded-xl px-3 py-2 text-xs"
                    value={newInteractionDate}
                    onChange={(e) => setNewInteractionDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <textarea
                  className="w-full bg-transparent text-sm text-slate-300 placeholder:text-slate-500 min-h-[80px] focus:outline-none"
                  placeholder="What did you talk about? Any action items?"
                  value={newInteractionNotes}
                  onChange={(e) => setNewInteractionNotes(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-violet-500/25 transition-all">
                    <Plus size={14} /> Log Interaction
                  </button>
                </div>
              </div>
            </form>

            <div className="relative border-l-2 border-white/10 ml-4 space-y-8 pl-8">
              {interactions.length === 0 ? (
                <p className="text-slate-500 text-sm py-4">No interactions logged yet.</p>
              ) : (
                interactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(interaction => (
                  <div key={interaction.id} className="relative group">
                    <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-dark-900 border-2 border-violet-500 shadow-lg shadow-violet-500/25" />

                    {editingInteractionId === interaction.id && editedInteraction ? (
                      <div className="glass-light p-4 rounded-xl">
                        <div className="flex gap-3 mb-3">
                          <select
                            className="input-dark rounded-xl px-3 py-2 text-xs font-bold"
                            value={editedInteraction.type}
                            onChange={(e) => setEditedInteraction({ ...editedInteraction, type: e.target.value as InteractionType })}
                          >
                            {Object.values(InteractionType).map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          <input
                            type="date"
                            className="input-dark rounded-xl px-3 py-2 text-xs"
                            value={editedInteraction.date}
                            onChange={(e) => setEditedInteraction({ ...editedInteraction, date: e.target.value })}
                            max={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <textarea
                          className="w-full input-dark rounded-xl p-3 text-sm mb-3"
                          value={editedInteraction.notes}
                          onChange={(e) => setEditedInteraction({ ...editedInteraction, notes: e.target.value })}
                          rows={3}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setEditingInteractionId(null); setEditedInteraction(null); }}
                            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveInteraction}
                            className="px-3 py-1.5 text-sm text-white bg-gradient-to-r from-violet-500 to-cyan-500 rounded-lg"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">{interaction.type}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">{interaction.date}</span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <button
                                onClick={() => handleEditInteraction(interaction)}
                                className="text-slate-500 hover:text-violet-400 transition-colors"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => onDeleteInteraction(interaction.id)}
                                className="text-slate-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{interaction.notes}</p>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactDetail;
