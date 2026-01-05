
import React, { useState } from 'react';
import { Plus, Check, Trash2, Calendar, User, Flag, X, RefreshCw, Clock, Bell, Smartphone, Pencil } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Task, Contact, TaskFrequency } from '../types';

interface TaskListProps {
  tasks: Task[];
  contacts: Contact[];
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onToggleTask: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  contacts,
  onAddTask,
  onUpdateTask,
  onToggleTask,
  onDeleteTask,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    contactId: '',
    dueDateTime: null as Date | null,
    reminderBefore: '' as string | number,
    priority: 'medium' as Task['priority'],
    frequency: 'none' as TaskFrequency,
  });

  // Edit state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editedTask, setEditedTask] = useState({
    title: '',
    description: '',
    contactId: '',
    dueDateTime: null as Date | null,
    reminderBefore: '' as string | number,
    priority: 'medium' as Task['priority'],
    frequency: 'none' as TaskFrequency,
  });

  const reminderOptions = [
    { value: '', label: 'No reminder' },
    { value: 0, label: 'At time of task' },
    { value: 15, label: '15 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
    { value: 120, label: '2 hours before' },
  ];

  const frequencyLabels: Record<TaskFrequency, string> = {
    none: 'One-time',
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  };

  // Helper to format date as YYYY-MM-DD
  const formatDate = (date: Date | null): string | undefined => {
    if (!date) return undefined;
    return date.toISOString().split('T')[0];
  };

  // Helper to format time as HH:MM
  const formatTime = (date: Date | null): string | undefined => {
    if (!date) return undefined;
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Helper to parse date and time strings into Date object
  const parseDateTime = (dueDate?: string, dueTime?: string): Date | null => {
    if (!dueDate) return null;
    const date = new Date(dueDate + 'T00:00:00');
    if (dueTime) {
      const [hours, minutes] = dueTime.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
    }
    return date;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    onAddTask({
      title: newTask.title,
      description: newTask.description || undefined,
      contactId: newTask.contactId || undefined,
      dueDate: formatDate(newTask.dueDateTime),
      dueTime: formatTime(newTask.dueDateTime),
      reminderBefore: newTask.reminderBefore !== '' ? Number(newTask.reminderBefore) : undefined,
      priority: newTask.priority,
      frequency: newTask.frequency,
      completed: false,
    });

    setNewTask({ title: '', description: '', contactId: '', dueDateTime: null, reminderBefore: '', priority: 'medium', frequency: 'none' });
    setShowAddForm(false);
  };

  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditedTask({
      title: task.title,
      description: task.description || '',
      contactId: task.contactId || '',
      dueDateTime: parseDateTime(task.dueDate, task.dueTime),
      reminderBefore: task.reminderBefore !== undefined ? task.reminderBefore : '',
      priority: task.priority,
      frequency: task.frequency,
    });
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditedTask({ title: '', description: '', contactId: '', dueDateTime: null, reminderBefore: '', priority: 'medium', frequency: 'none' });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId || !editedTask.title.trim()) return;

    onUpdateTask(editingTaskId, {
      title: editedTask.title,
      description: editedTask.description || undefined,
      contactId: editedTask.contactId || undefined,
      dueDate: formatDate(editedTask.dueDateTime),
      dueTime: formatTime(editedTask.dueDateTime),
      reminderBefore: editedTask.reminderBefore !== '' ? Number(editedTask.reminderBefore) : undefined,
      priority: editedTask.priority,
      frequency: editedTask.frequency,
    });

    handleCancelEdit();
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                  <Calendar size={10} /> Due Date & Time
                </label>
                <DatePicker
                  selected={newTask.dueDateTime}
                  onChange={(date) => setNewTask({ ...newTask, dueDateTime: date })}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  placeholderText="Select date and time..."
                  className="w-full px-4 py-2.5 input-dark rounded-xl text-sm"
                  calendarClassName="dark-calendar"
                  isClearable
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                  <Bell size={10} /> Reminder
                  {newTask.reminderBefore !== '' && (
                    <span className="ml-1 text-violet-400 flex items-center gap-0.5" title="Reminder will be sent to your phone">
                      <Smartphone size={10} />
                    </span>
                  )}
                </label>
                <select
                  className="w-full px-4 py-2.5 input-dark rounded-xl text-sm"
                  value={newTask.reminderBefore}
                  onChange={e => setNewTask({ ...newTask, reminderBefore: e.target.value === '' ? '' : Number(e.target.value) })}
                >
                  {reminderOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
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
            {newTask.reminderBefore !== '' && (
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                <Smartphone size={12} className="text-violet-400" />
                Reminder will be sent as a push notification to your mobile device
              </p>
            )}
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
              editingTaskId === task.id ? (
                /* Edit Form */
                <div key={task.id} className="px-6 py-4 bg-white/5">
                  <form onSubmit={handleSaveEdit} className="space-y-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-white">Edit Task</h4>
                      <button type="button" onClick={handleCancelEdit} className="text-slate-500 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg">
                        <X size={18} />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Task title..."
                      className="w-full px-4 py-3 input-dark rounded-xl"
                      value={editedTask.title}
                      onChange={e => setEditedTask({ ...editedTask, title: e.target.value })}
                      required
                    />
                    <textarea
                      placeholder="Description (optional)"
                      className="w-full px-4 py-3 input-dark rounded-xl resize-none"
                      rows={2}
                      value={editedTask.description}
                      onChange={e => setEditedTask({ ...editedTask, description: e.target.value })}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                          <Calendar size={10} /> Due Date & Time
                        </label>
                        <DatePicker
                          selected={editedTask.dueDateTime}
                          onChange={(date) => setEditedTask({ ...editedTask, dueDateTime: date })}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          dateFormat="MMMM d, yyyy h:mm aa"
                          placeholderText="Select date and time..."
                          className="w-full px-4 py-2.5 input-dark rounded-xl text-sm"
                          calendarClassName="dark-calendar"
                          isClearable
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                          <Bell size={10} /> Reminder
                          {editedTask.reminderBefore !== '' && (
                            <span className="ml-1 text-violet-400 flex items-center gap-0.5" title="Reminder will be sent to your phone">
                              <Smartphone size={10} />
                            </span>
                          )}
                        </label>
                        <select
                          className="w-full px-4 py-2.5 input-dark rounded-xl text-sm"
                          value={editedTask.reminderBefore}
                          onChange={e => setEditedTask({ ...editedTask, reminderBefore: e.target.value === '' ? '' : Number(e.target.value) })}
                        >
                          {reminderOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                          <RefreshCw size={10} /> Repeat
                        </label>
                        <select
                          className="w-full px-4 py-2.5 input-dark rounded-xl text-sm"
                          value={editedTask.frequency}
                          onChange={e => setEditedTask({ ...editedTask, frequency: e.target.value as TaskFrequency })}
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
                          value={editedTask.contactId}
                          onChange={e => setEditedTask({ ...editedTask, contactId: e.target.value })}
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
                          value={editedTask.priority}
                          onChange={e => setEditedTask({ ...editedTask, priority: e.target.value as Task['priority'] })}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>
                    {editedTask.reminderBefore !== '' && (
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Smartphone size={12} className="text-violet-400" />
                        Reminder will be sent as a push notification to your mobile device
                      </p>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex-1 py-2.5 text-slate-400 font-semibold hover:text-white hover:bg-white/5 rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 transition-all"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* View Mode */
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
                          {task.dueTime && (
                            <span className="flex items-center gap-1 ml-1">
                              <Clock size={10} /> {task.dueTime}
                            </span>
                          )}
                        </span>
                      )}
                      {getContactName(task.contactId) && (
                        <span className="flex items-center gap-1">
                          <User size={12} /> {getContactName(task.contactId)}
                        </span>
                      )}
                      {task.reminderBefore !== undefined && (
                        <span className="flex items-center gap-1 text-violet-400" title={`Reminder: ${task.reminderBefore === 0 ? 'At time of task' : `${task.reminderBefore} min before`}`}>
                          <Smartphone size={12} />
                          <Bell size={10} />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartEdit(task)}
                      className="text-slate-600 hover:text-violet-400 transition-colors p-1 hover:bg-violet-500/10 rounded-lg"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="text-slate-600 hover:text-rose-400 transition-colors p-1 hover:bg-rose-500/10 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
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
