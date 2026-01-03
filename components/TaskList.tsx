
import React, { useState } from 'react';
import { Plus, Check, Trash2, Calendar, User, Flag, X, RefreshCw } from 'lucide-react';
import { Task, Contact, TaskFrequency } from '../types';

interface TaskListProps {
  tasks: Task[];
  contacts: Contact[];
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onToggleTask: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  contacts,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    contactId: '',
    dueDate: '',
    priority: 'medium' as Task['priority'],
    frequency: 'none' as TaskFrequency,
  });

  const frequencyLabels: Record<TaskFrequency, string> = {
    none: 'One-time',
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    onAddTask({
      title: newTask.title,
      description: newTask.description || undefined,
      contactId: newTask.contactId || undefined,
      dueDate: newTask.dueDate || undefined,
      priority: newTask.priority,
      frequency: newTask.frequency,
      completed: false,
    });

    setNewTask({ title: '', description: '', contactId: '', dueDate: '', priority: 'medium', frequency: 'none' });
    setShowAddForm(false);
  };

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  const getContactName = (contactId?: string) => {
    if (!contactId) return null;
    const contact = contacts.find(c => c.id === contactId);
    return contact ? `${contact.firstName} ${contact.lastName}` : null;
  };

  const getPriorityStyles = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'low': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date(new Date().toDateString());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Tasks</h2>
          <p className="text-slate-400 text-sm mt-1">
            <span className="text-white font-semibold">{pendingTasks.length}</span> pending, <span className="text-slate-500">{completedTasks.length}</span> completed
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-gradient-to-r from-violet-500 to-cyan-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
        >
          <Plus size={18} /> New Task
        </button>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <div className="glass-strong rounded-2xl p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-lg text-white">New Task</h3>
            <button onClick={() => setShowAddForm(false)} className="text-slate-500 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Task title..."
                className="w-full px-4 py-3.5 input-dark rounded-xl"
                value={newTask.title}
                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                required
              />
            </div>
            <div>
              <textarea
                placeholder="Description (optional)"
                className="w-full px-4 py-3.5 input-dark rounded-xl resize-none"
                rows={2}
                value={newTask.description}
                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                  <Calendar size={10} /> Due Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2.5 input-dark rounded-xl text-sm"
                  value={newTask.dueDate}
                  onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                  <RefreshCw size={10} /> Repeat
                </label>
                <select
                  className="w-full px-4 py-2.5 input-dark rounded-xl text-sm"
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
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                  <User size={10} /> Link Contact
                </label>
                <select
                  className="w-full px-4 py-2.5 input-dark rounded-xl text-sm"
                  value={newTask.contactId}
                  onChange={e => setNewTask({ ...newTask, contactId: e.target.value })}
                >
                  <option value="">None</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                  <Flag size={10} /> Priority
                </label>
                <select
                  className="w-full px-4 py-2.5 input-dark rounded-xl text-sm"
                  value={newTask.priority}
                  onChange={e => setNewTask({ ...newTask, priority: e.target.value as Task['priority'] })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-3 text-slate-400 font-semibold hover:text-white hover:bg-white/5 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 transition-all"
              >
                Add Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending Tasks */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white">Pending Tasks</h3>
        </div>
        <div className="divide-y divide-white/5">
          {pendingTasks.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500">
              No pending tasks. Create one to get started!
            </div>
          ) : (
            pendingTasks.map(task => (
              <div key={task.id} className="px-6 py-4 flex items-start gap-4 hover:bg-white/5 transition-colors group">
                <button
                  onClick={() => onToggleTask(task.id, true)}
                  className="mt-1 w-5 h-5 rounded-lg border-2 border-slate-600 hover:border-violet-500 hover:bg-violet-500/20 transition-all flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white">{task.title}</span>
                    <span className={`text-[10px] px-2 py-1 rounded-lg border font-semibold uppercase tracking-wide ${getPriorityStyles(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.frequency && task.frequency !== 'none' && (
                      <span className="text-[10px] px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/30 font-semibold uppercase tracking-wide flex items-center gap-1">
                        <RefreshCw size={8} />
                        {frequencyLabels[task.frequency]}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-slate-400 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    {task.dueDate && (
                      <span className={`flex items-center gap-1 ${isOverdue(task.dueDate) ? 'text-rose-400 font-medium' : ''}`}>
                        <Calendar size={12} />
                        {isOverdue(task.dueDate) ? 'Overdue: ' : ''}{task.dueDate}
                      </span>
                    )}
                    {getContactName(task.contactId) && (
                      <span className="flex items-center gap-1">
                        <User size={12} /> {getContactName(task.contactId)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/10 rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <h3 className="font-semibold text-slate-400">Completed</h3>
          </div>
          <div className="divide-y divide-white/5">
            {completedTasks.map(task => (
              <div key={task.id} className="px-6 py-4 flex items-start gap-4 hover:bg-white/5 transition-colors opacity-50 hover:opacity-70 group">
                <button
                  onClick={() => onToggleTask(task.id, false)}
                  className="mt-1 w-5 h-5 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30"
                >
                  <Check size={12} className="text-white" />
                </button>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-400 line-through">{task.title}</span>
                  {getContactName(task.contactId) && (
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                      <User size={12} /> {getContactName(task.contactId)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/10 rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
