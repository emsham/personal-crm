
import React, { useState } from 'react';
import { Plus, Check, Trash2, Calendar, User, Flag, X } from 'lucide-react';
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

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-500 bg-orange-50 border-orange-200';
      case 'low': return 'text-green-500 bg-green-50 border-green-200';
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
          <h2 className="text-2xl font-bold text-slate-900">Tasks</h2>
          <p className="text-slate-500 text-sm mt-1">
            {pendingTasks.length} pending, {completedTasks.length} completed
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all"
        >
          <Plus size={18} /> New Task
        </button>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-slate-900">New Task</h3>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Task title..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={newTask.title}
                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                required
              />
            </div>
            <div>
              <textarea
                placeholder="Description (optional)"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                rows={2}
                value={newTask.description}
                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                  <Calendar size={12} className="inline mr-1" /> Due Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={newTask.dueDate}
                  onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                  Repeat
                </label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                  <User size={12} className="inline mr-1" /> Link Contact
                </label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                  <Flag size={12} className="inline mr-1" /> Priority
                </label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
              >
                Add Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending Tasks */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Pending Tasks</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {pendingTasks.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400">
              No pending tasks. Create one to get started!
            </div>
          ) : (
            pendingTasks.map(task => (
              <div key={task.id} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                <button
                  onClick={() => onToggleTask(task.id, true)}
                  className="mt-1 w-5 h-5 rounded-full border-2 border-slate-300 hover:border-indigo-500 transition-colors flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-900">{task.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.frequency && task.frequency !== 'none' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
                        {frequencyLabels[task.frequency]}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    {task.dueDate && (
                      <span className={`flex items-center gap-1 ${isOverdue(task.dueDate) ? 'text-red-500 font-medium' : ''}`}>
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
                  className="text-slate-300 hover:text-red-500 transition-colors"
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Completed</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {completedTasks.map(task => (
              <div key={task.id} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors opacity-60">
                <button
                  onClick={() => onToggleTask(task.id, false)}
                  className="mt-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0"
                >
                  <Check size={12} className="text-white" />
                </button>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-900 line-through">{task.title}</span>
                  {getContactName(task.contactId) && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <User size={12} /> {getContactName(task.contactId)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors"
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
