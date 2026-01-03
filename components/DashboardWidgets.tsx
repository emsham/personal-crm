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
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Dashboard</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Users} label="Contacts" value={totalContacts} sublabel={`${activeContacts} active`} color="indigo" />
            <StatCard icon={Clock} label="Interactions" value={recentInteractions} sublabel="last 30 days" color="blue" />
            <StatCard icon={ListTodo} label="Tasks" value={pendingTasks} sublabel="pending" color="amber" />
            <StatCard icon={TrendingUp} label="Active Rate" value={`${totalContacts > 0 ? Math.round((activeContacts / totalContacts) * 100) : 0}%`} sublabel="of contacts" color="green" />
          </div>

          {/* Upcoming Tasks */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <CheckSquare size={16} className="text-slate-400" />
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
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={onViewTasks}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        task.priority === 'high' ? 'bg-red-500' :
                        task.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">{task.title}</div>
                        <div className={`text-xs ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                          {isOverdue ? 'Overdue: ' : ''}{task.dueDate}
                          {contact && ` · ${contact.firstName}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No upcoming tasks</p>
            )}
          </div>

          {/* Upcoming Celebrations */}
          {upcomingDates.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Cake size={16} className="text-pink-500" />
                Upcoming Celebrations
              </h3>
              <div className="space-y-2">
                {upcomingDates.slice(0, 4).map((item, idx) => (
                  <div
                    key={`${item.contact.id}-${idx}`}
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl hover:from-pink-100 hover:to-purple-100 transition-colors cursor-pointer"
                    onClick={() => onSelectContact(item.contact)}
                  >
                    <div className="relative">
                      <img
                        src={item.contact.avatar || `https://ui-avatars.com/api/?name=${item.contact.firstName}+${item.contact.lastName}`}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                        item.type === 'birthday' ? 'bg-pink-500' : 'bg-amber-500'
                      }`}>
                        {item.type === 'birthday' ? <Cake size={10} className="text-white" /> : <Star size={10} className="text-white" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {item.contact.firstName} {item.contact.lastName}
                      </div>
                      <div className={`text-xs ${
                        item.daysUntil === 0 ? 'text-pink-600 font-medium' :
                        item.daysUntil <= 7 ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {item.daysUntil === 0 ? 'Today!' : item.daysUntil === 1 ? 'Tomorrow' : `in ${item.daysUntil} days`}
                        {' · '}{item.label}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300" />
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
  color: 'indigo' | 'blue' | 'amber' | 'green';
}> = ({ icon: Icon, label, value, sublabel, color }) => {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className={`inline-flex p-2 rounded-lg ${colors[color]} mb-2`}>
        <Icon size={16} />
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{sublabel}</div>
    </div>
  );
};

export default DashboardWidgets;
