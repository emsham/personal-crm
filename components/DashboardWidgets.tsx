import React, { useState } from 'react';
import { X, ChevronRight, CheckSquare, Cake, Star, Clock, Users, ListTodo, TrendingUp, Settings, Sparkles, Bot } from 'lucide-react';
import { Contact, Task, Interaction } from '../types';
import LLMSettingsModal from './chat/LLMSettingsModal';

interface DashboardWidgetsProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  tasks: Task[];
  interactions: Interaction[];
  onSelectContact: (contact: Contact) => void;
  onViewTasks: () => void;
  fullPage?: boolean;
}

const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({
  isOpen,
  onClose,
  contacts,
  tasks,
  interactions,
  onSelectContact,
  onViewTasks,
  fullPage = false,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Helper to parse date in local timezone
  const parseLocalDate = (dateStr: string) => new Date(dateStr + 'T00:00:00');

  // Get start of today for comparisons
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Stats
  const totalContacts = contacts.length;
  const activeContacts = contacts.filter(c => c.status === 'active').length;
  const pendingTasks = tasks.filter(t => !t.completed).length;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentInteractions = interactions.filter(i => new Date(i.date) >= thirtyDaysAgo).length;

  // Upcoming tasks
  const upcomingTasks = tasks
    .filter(t => !t.completed && t.dueDate)
    .sort((a, b) => parseLocalDate(a.dueDate!).getTime() - parseLocalDate(b.dueDate!).getTime())
    .slice(0, 4);

  // Upcoming celebrations
  const upcomingDates: { contact: Contact; label: string; daysUntil: number; type: 'birthday' | 'important' }[] = [];

  contacts.forEach(contact => {
    if (contact.birthday) {
      const [month, day] = contact.birthday.split('-').map(Number);
      const thisYear = new Date(today.getFullYear(), month - 1, day);
      const nextYear = new Date(today.getFullYear() + 1, month - 1, day);
      const targetDate = thisYear >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) ? thisYear : nextYear;
      const daysUntil = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil <= 30) {
        upcomingDates.push({ contact, label: 'Birthday', daysUntil, type: 'birthday' });
      }
    }

    contact.importantDates?.forEach(importantDate => {
      const [month, day] = importantDate.date.split('-').map(Number);
      const thisYear = new Date(today.getFullYear(), month - 1, day);
      const nextYear = new Date(today.getFullYear() + 1, month - 1, day);
      const targetDate = thisYear >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) ? thisYear : nextYear;
      const daysUntil = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil <= 30) {
        upcomingDates.push({ contact, label: importantDate.label, daysUntil, type: 'important' });
      }
    });
  });

  upcomingDates.sort((a, b) => a.daysUntil - b.daysUntil);

  if (!isOpen) return null;

  // Full page mode - shown when no API key is configured
  if (fullPage) {
    return (
      <div className="h-screen -m-4 md:-m-6 lg:-m-8 overflow-hidden flex flex-col">
        {/* Full page header */}
        <div className="flex-shrink-0 px-4 md:px-6 lg:px-8 py-6 border-b border-white/5">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="pl-14 lg:pl-0">
              <h1 className="text-xl md:text-2xl font-bold text-white">Welcome to Nexus</h1>
              <p className="text-slate-400 text-sm mt-1">Your personal CRM dashboard</p>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all"
            >
              <Sparkles size={18} />
              Enable AI Assistant
            </button>
          </div>
        </div>

        {/* Full page content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {/* AI Setup Card */}
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Bot size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">Unlock Nexus Brain</h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Configure your AI provider to enable natural language interactions with your CRM.
                    Ask questions, add contacts, log interactions, and manage tasks - all through conversation.
                  </p>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-all border border-violet-500/20"
                  >
                    <Settings size={16} />
                    Configure API Key
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard icon={Users} label="Contacts" value={totalContacts} sublabel={`${activeContacts} active`} color="violet" />
              <StatCard icon={Clock} label="Interactions" value={recentInteractions} sublabel="last 30 days" color="cyan" />
              <StatCard icon={ListTodo} label="Tasks" value={pendingTasks} sublabel="pending" color="amber" />
              <StatCard icon={TrendingUp} label="Active Rate" value={`${totalContacts > 0 ? Math.round((activeContacts / totalContacts) * 100) : 0}%`} sublabel="of contacts" color="emerald" />
            </div>

            {/* Two column layout for tasks and celebrations */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Upcoming Tasks */}
              <div className="glass rounded-2xl p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckSquare size={20} className="text-violet-400" />
                  Upcoming Tasks
                </h3>
                {upcomingTasks.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingTasks.map(task => {
                      const contact = contacts.find(c => c.id === task.contactId);
                      // Check if task is overdue - either past date, or today with time passed
                      let isOverdue = false;
                      if (task.dueDate) {
                        const dueDate = parseLocalDate(task.dueDate);
                        if (dueDate < today) {
                          isOverdue = true;
                        } else if (dueDate.getTime() === today.getTime() && task.dueTime) {
                          const [hours, minutes] = task.dueTime.split(':').map(Number);
                          const dueDateTime = new Date(dueDate);
                          dueDateTime.setHours(hours, minutes, 0, 0);
                          isOverdue = dueDateTime < new Date();
                        }
                      }
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-3 glass-light rounded-xl hover:bg-white/10 transition-all cursor-pointer group"
                          onClick={onViewTasks}
                        >
                          <div className={`w-2 h-2 rounded-full ${
                            task.priority === 'high' ? 'bg-rose-500 shadow-lg shadow-rose-500/50' :
                            task.priority === 'medium' ? 'bg-amber-500 shadow-lg shadow-amber-500/50' : 'bg-slate-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate group-hover:text-violet-300 transition-colors">{task.title}</div>
                            <div className={`text-xs ${isOverdue ? 'text-rose-400' : 'text-slate-500'}`}>
                              {isOverdue ? 'Overdue: ' : ''}{task.dueDate}
                              {contact && ` · ${contact.firstName}`}
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-slate-600 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">No upcoming tasks</p>
                )}
              </div>

              {/* Upcoming Celebrations */}
              <div className="glass rounded-2xl p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Cake size={20} className="text-pink-400" />
                  Upcoming Celebrations
                </h3>
                {upcomingDates.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingDates.slice(0, 4).map((item, idx) => (
                      <div
                        key={`${item.contact.id}-${idx}`}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-500/20 hover:from-pink-500/20 hover:to-violet-500/20 transition-all cursor-pointer group"
                        onClick={() => onSelectContact(item.contact)}
                      >
                        <div className="relative">
                          <div className="w-10 h-10 rounded-xl bg-black ring-2 ring-white/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-white">
                              {item.contact.firstName?.charAt(0).toUpperCase() || ''}{item.contact.lastName?.charAt(0).toUpperCase() || ''}
                            </span>
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center shadow-lg ${
                            item.type === 'birthday' ? 'bg-pink-500 shadow-pink-500/50' : 'bg-amber-500 shadow-amber-500/50'
                          }`}>
                            {item.type === 'birthday' ? <Cake size={10} className="text-white" /> : <Star size={10} className="text-white" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate group-hover:text-pink-300 transition-colors">
                            {item.contact.firstName} {item.contact.lastName}
                          </div>
                          <div className={`text-xs ${
                            item.daysUntil === 0 ? 'text-pink-400 font-medium' :
                            item.daysUntil <= 7 ? 'text-amber-400' : 'text-slate-500'
                          }`}>
                            {item.daysUntil === 0 ? 'Today!' : item.daysUntil === 1 ? 'Tomorrow' : `in ${item.daysUntil} days`}
                            {' · '}{item.label}
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-600 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">No upcoming celebrations</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <LLMSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    );
  }

  // Slide-out panel mode (original)
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md glass-strong shadow-2xl z-50 overflow-y-auto border-l border-white/5">
        {/* Header */}
        <div className="sticky top-0 glass-strong border-b border-white/5 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-white">Dashboard</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Users} label="Contacts" value={totalContacts} sublabel={`${activeContacts} active`} color="violet" />
            <StatCard icon={Clock} label="Interactions" value={recentInteractions} sublabel="last 30 days" color="cyan" />
            <StatCard icon={ListTodo} label="Tasks" value={pendingTasks} sublabel="pending" color="amber" />
            <StatCard icon={TrendingUp} label="Active Rate" value={`${totalContacts > 0 ? Math.round((activeContacts / totalContacts) * 100) : 0}%`} sublabel="of contacts" color="emerald" />
          </div>

          {/* Upcoming Tasks */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <CheckSquare size={16} className="text-violet-400" />
              Upcoming Tasks
            </h3>
            {upcomingTasks.length > 0 ? (
              <div className="space-y-2">
                {upcomingTasks.map(task => {
                  const contact = contacts.find(c => c.id === task.contactId);
                  // Check if task is overdue - either past date, or today with time passed
                  let isOverdue = false;
                  if (task.dueDate) {
                    const dueDate = parseLocalDate(task.dueDate);
                    if (dueDate < today) {
                      isOverdue = true;
                    } else if (dueDate.getTime() === today.getTime() && task.dueTime) {
                      const [hours, minutes] = task.dueTime.split(':').map(Number);
                      const dueDateTime = new Date(dueDate);
                      dueDateTime.setHours(hours, minutes, 0, 0);
                      isOverdue = dueDateTime < new Date();
                    }
                  }
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 glass-light rounded-xl hover:bg-white/10 transition-all cursor-pointer group"
                      onClick={onViewTasks}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        task.priority === 'high' ? 'bg-rose-500 shadow-lg shadow-rose-500/50' :
                        task.priority === 'medium' ? 'bg-amber-500 shadow-lg shadow-amber-500/50' : 'bg-slate-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate group-hover:text-violet-300 transition-colors">{task.title}</div>
                        <div className={`text-xs ${isOverdue ? 'text-rose-400' : 'text-slate-500'}`}>
                          {isOverdue ? 'Overdue: ' : ''}{task.dueDate}
                          {contact && ` · ${contact.firstName}`}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-600 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-6 glass-light rounded-xl">No upcoming tasks</p>
            )}
          </div>

          {/* Upcoming Celebrations */}
          {upcomingDates.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Cake size={16} className="text-pink-400" />
                Upcoming Celebrations
              </h3>
              <div className="space-y-2">
                {upcomingDates.slice(0, 4).map((item, idx) => (
                  <div
                    key={`${item.contact.id}-${idx}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-500/20 hover:from-pink-500/20 hover:to-violet-500/20 transition-all cursor-pointer group"
                    onClick={() => onSelectContact(item.contact)}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-black ring-2 ring-white/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {item.contact.firstName?.charAt(0).toUpperCase() || ''}{item.contact.lastName?.charAt(0).toUpperCase() || ''}
                        </span>
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center shadow-lg ${
                        item.type === 'birthday' ? 'bg-pink-500 shadow-pink-500/50' : 'bg-amber-500 shadow-amber-500/50'
                      }`}>
                        {item.type === 'birthday' ? <Cake size={10} className="text-white" /> : <Star size={10} className="text-white" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate group-hover:text-pink-300 transition-colors">
                        {item.contact.firstName} {item.contact.lastName}
                      </div>
                      <div className={`text-xs ${
                        item.daysUntil === 0 ? 'text-pink-400 font-medium' :
                        item.daysUntil <= 7 ? 'text-amber-400' : 'text-slate-500'
                      }`}>
                        {item.daysUntil === 0 ? 'Today!' : item.daysUntil === 1 ? 'Tomorrow' : `in ${item.daysUntil} days`}
                        {' · '}{item.label}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Stat card component
const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  sublabel: string;
  color: 'violet' | 'cyan' | 'amber' | 'emerald';
}> = ({ icon: Icon, label, value, sublabel, color }) => {
  const colors = {
    violet: 'from-violet-500/20 to-violet-500/5 text-violet-400 border-violet-500/20',
    cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
  };

  const iconColors = {
    violet: 'text-violet-400 shadow-violet-500/30',
    cyan: 'text-cyan-400 shadow-cyan-500/30',
    amber: 'text-amber-400 shadow-amber-500/30',
    emerald: 'text-emerald-400 shadow-emerald-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className={`inline-flex p-2 rounded-lg bg-white/5 ${iconColors[color]} mb-3`}>
        <Icon size={16} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500">{sublabel}</div>
    </div>
  );
};

export default DashboardWidgets;
