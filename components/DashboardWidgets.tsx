import React from 'react';
import { X, ChevronRight, CheckSquare, Cake, Star, Clock, Users, ListTodo, TrendingUp } from 'lucide-react';
import { Contact, Task, Interaction } from '../types';

interface DashboardWidgetsProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  tasks: Task[];
  interactions: Interaction[];
  onSelectContact: (contact: Contact) => void;
  onViewTasks: () => void;
}

const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({
  isOpen,
  onClose,
  contacts,
  tasks,
  interactions,
  onSelectContact,
  onViewTasks,
}) => {
  const today = new Date();

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
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
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

        <div className="p-6 space-y-6">
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
                  const isOverdue = task.dueDate && new Date(task.dueDate) < today;
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
                      <img
                        src={item.contact.avatar || `https://ui-avatars.com/api/?name=${item.contact.firstName}+${item.contact.lastName}`}
                        alt=""
                        className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10"
                      />
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
