import { Contact, Interaction, Task, InteractionType } from '../types';
import { ToolCall } from '../shared/ai/types';
import * as firestoreService from './firestoreService';

export interface CRMData {
  contacts: Contact[];
  interactions: Interaction[];
  tasks: Task[];
}

export interface ToolExecutorContext {
  userId: string;
  data: CRMData;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  success: boolean;
  error?: string;
}

type ToolArguments = Record<string, unknown>;

// Helper to find contact by ID or name
function findContact(contacts: Contact[], args: { contactId?: string; contactName?: string }): Contact | null {
  if (args.contactId) {
    return contacts.find(c => c.id === args.contactId) || null;
  }
  if (args.contactName) {
    const name = args.contactName.toLowerCase();
    return contacts.find(c => {
      const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
      return (
        fullName.includes(name) ||
        (c.firstName || '').toLowerCase().includes(name) ||
        (c.lastName || '').toLowerCase().includes(name)
      );
    }) || null;
  }
  return null;
}

// Helper to find task by ID or title
function findTask(tasks: Task[], args: { taskId?: string; taskTitle?: string }): Task | null {
  if (args.taskId) {
    return tasks.find(t => t.id === args.taskId) || null;
  }
  if (args.taskTitle) {
    const title = args.taskTitle.toLowerCase();
    return tasks.find(t => t.title.toLowerCase().includes(title)) || null;
  }
  return null;
}

// Query executors
function executeSearchContacts(contacts: Contact[], args: ToolArguments): Contact[] {
  let results = [...contacts];

  const query = args.query as string | undefined;
  const status = args.status as string | undefined;
  const tags = args.tags as string[] | undefined;
  const limit = (args.limit as number) || 10;

  if (query) {
    const q = query.toLowerCase();
    results = results.filter(c => {
      const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
      return (
        fullName.includes(q) ||
        (c.firstName || '').toLowerCase().includes(q) ||
        (c.lastName || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.tags || []).some(t => t.toLowerCase().includes(q))
      );
    });
  }

  if (status && status !== 'all') {
    results = results.filter(c => c.status === status);
  }

  if (tags && tags.length > 0) {
    const tagsLower = tags.map(t => t.toLowerCase());
    results = results.filter(c =>
      (c.tags || []).some(t => tagsLower.some(tl => t.toLowerCase().includes(tl)))
    );
  }

  return results.slice(0, limit);
}

function executeGetContactDetails(
  contacts: Contact[],
  interactions: Interaction[],
  tasks: Task[],
  args: ToolArguments
): { contact: Contact; recentInteractions: Interaction[]; pendingTasks: Task[] } | null {
  const contact = findContact(contacts, args as { contactId?: string; contactName?: string });
  if (!contact) return null;

  const recentInteractions = interactions
    .filter(i => i.contactId === contact.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const pendingTasks = tasks.filter(t => t.contactId === contact.id && !t.completed);

  return { contact, recentInteractions, pendingTasks };
}

function executeSearchInteractions(
  contacts: Contact[],
  interactions: Interaction[],
  args: ToolArguments
): Interaction[] {
  let results = [...interactions];

  const contactId = args.contactId as string | undefined;
  const contactName = args.contactName as string | undefined;
  const type = args.type as string | undefined;
  const startDate = args.startDate as string | undefined;
  const endDate = args.endDate as string | undefined;
  const query = args.query as string | undefined;
  const limit = (args.limit as number) || 20;

  if (contactName && !contactId) {
    const contact = findContact(contacts, { contactName });
    if (contact) {
      results = results.filter(i => i.contactId === contact.id);
    }
  } else if (contactId) {
    results = results.filter(i => i.contactId === contactId);
  }

  if (type) {
    results = results.filter(i => i.type === type);
  }

  if (startDate) {
    results = results.filter(i => new Date(i.date) >= new Date(startDate));
  }

  if (endDate) {
    results = results.filter(i => new Date(i.date) <= new Date(endDate));
  }

  if (query) {
    const q = query.toLowerCase();
    results = results.filter(i => i.notes.toLowerCase().includes(q));
  }

  return results
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

function executeSearchTasks(
  contacts: Contact[],
  tasks: Task[],
  args: ToolArguments
): Task[] {
  let results = [...tasks];

  const completed = args.completed as boolean | undefined;
  const priority = args.priority as string | undefined;
  const contactId = args.contactId as string | undefined;
  const contactName = args.contactName as string | undefined;
  const dueBefore = args.dueBefore as string | undefined;
  const dueAfter = args.dueAfter as string | undefined;
  const overdue = args.overdue as boolean | undefined;
  const limit = (args.limit as number) || 20;

  if (completed !== undefined) {
    results = results.filter(t => t.completed === completed);
  }

  if (priority) {
    results = results.filter(t => t.priority === priority);
  }

  if (contactName && !contactId) {
    const contact = findContact(contacts, { contactName });
    if (contact) {
      results = results.filter(t => t.contactId === contact.id);
    }
  } else if (contactId) {
    results = results.filter(t => t.contactId === contactId);
  }

  if (dueBefore) {
    results = results.filter(t => t.dueDate && new Date(t.dueDate) <= new Date(dueBefore));
  }

  if (dueAfter) {
    results = results.filter(t => t.dueDate && new Date(t.dueDate) >= new Date(dueAfter));
  }

  if (overdue) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    results = results.filter(t =>
      !t.completed && t.dueDate && new Date(t.dueDate) < today
    );
  }

  return results.slice(0, limit);
}

function executeGetStats(data: CRMData, args: ToolArguments): Record<string, unknown> {
  const metric = args.metric as string;
  const { contacts, interactions, tasks } = data;
  const today = new Date();

  // Helper functions for reuse
  const getOverview = () => ({
    totalContacts: contacts.length,
    activeContacts: contacts.filter(c => c.status === 'active').length,
    driftingContacts: contacts.filter(c => c.status === 'drifting').length,
    lostContacts: contacts.filter(c => c.status === 'lost').length,
    totalInteractions: interactions.length,
    totalTasks: tasks.length,
    pendingTasks: tasks.filter(t => !t.completed).length,
    overdueTasks: tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < today).length
  });

  const getInteractionsByType = () => {
    const byType: Record<string, number> = {};
    interactions.forEach(i => {
      byType[i.type] = (byType[i.type] || 0) + 1;
    });
    return byType;
  };

  const getContactsByStatus = () => ({
    active: contacts.filter(c => c.status === 'active').length,
    drifting: contacts.filter(c => c.status === 'drifting').length,
    lost: contacts.filter(c => c.status === 'lost').length
  });

  const getOverdueTasks = () =>
    tasks
      .filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < today)
      .map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, priority: t.priority }));

  const getRecentActivity = () =>
    interactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map(i => {
        const contact = contacts.find(c => c.id === i.contactId);
        return {
          type: i.type,
          date: i.date,
          contact: contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown',
          notes: i.notes.substring(0, 50) + (i.notes.length > 50 ? '...' : '')
        };
      });

  switch (metric) {
    case 'all':
      // Return comprehensive stats in a single call
      const overview = getOverview();
      const overdueTasks = getOverdueTasks();
      const recentActivity = getRecentActivity();
      return {
        ...overview,
        interactionsByType: getInteractionsByType(),
        overdueTasks: overdueTasks.length > 0 ? overdueTasks : undefined,
        recentActivity: recentActivity.length > 0 ? recentActivity.slice(0, 5) : undefined
      };

    case 'overview':
      return getOverview();

    case 'interactionsByType':
      return getInteractionsByType();

    case 'contactsByStatus':
      return getContactsByStatus();

    case 'upcomingBirthdays':
      const upcoming = contacts
        .filter(c => c.birthday)
        .map(c => {
          const [month, day] = c.birthday!.split('-').map(Number);
          const bday = new Date(today.getFullYear(), month - 1, day);
          if (bday < today) {
            bday.setFullYear(today.getFullYear() + 1);
          }
          const daysUntil = Math.ceil((bday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return { name: `${c.firstName} ${c.lastName}`, birthday: c.birthday, daysUntil };
        })
        .filter(b => b.daysUntil <= 30)
        .sort((a, b) => a.daysUntil - b.daysUntil);
      return { upcoming };

    case 'overdueTasks':
      return { tasks: getOverdueTasks() };

    case 'recentActivity':
      return { recentInteractions: getRecentActivity() };

    default:
      return { error: 'Unknown metric' };
  }
}

// Helper to resolve contact names to IDs
function resolveContactNames(contacts: Contact[], names: string[]): string[] {
  const ids: string[] = [];
  for (const name of names) {
    const found = findContact(contacts, { contactName: name });
    if (found) {
      ids.push(found.id);
    }
  }
  return ids;
}

// Create/Update executors
async function executeAddContact(
  userId: string,
  contacts: Contact[],
  args: ToolArguments
): Promise<{ success: boolean; contactId?: string; contact?: Partial<Contact> }> {
  const relatedContactNames = (args.relatedContactNames as string[]) || [];
  const relatedContactIds = resolveContactNames(contacts, relatedContactNames);

  const contact: Omit<Contact, 'id'> = {
    firstName: (args.firstName as string) || '',
    lastName: (args.lastName as string) || '',
    email: (args.email as string) || '',
    phone: (args.phone as string) || '',
    company: (args.company as string) || '',
    position: (args.position as string) || '',
    tags: (args.tags as string[]) || [],
    notes: (args.notes as string) || '',
    lastContacted: new Date().toISOString().split('T')[0],
    nextFollowUp: null,
    avatar: '',
    status: 'active',
    relatedContactIds
  };

  if (args.birthday) {
    contact.birthday = args.birthday as string;
  }

  const contactId = await firestoreService.addContact(userId, contact);

  // Update related contacts bidirectionally
  for (const relatedId of relatedContactIds) {
    const relatedContact = contacts.find(c => c.id === relatedId);
    if (relatedContact) {
      const updatedRelatedIds = [...(relatedContact.relatedContactIds || []), contactId];
      await firestoreService.updateContact(userId, relatedId, { relatedContactIds: updatedRelatedIds });
    }
  }

  // Auto-log initial interaction
  const initialNotes = (args.notes as string) || `First contact with ${args.firstName} ${args.lastName}`;
  const initialInteraction: Omit<Interaction, 'id'> = {
    contactId,
    type: InteractionType.OTHER,
    date: new Date().toISOString().split('T')[0],
    notes: `Initial contact added. ${initialNotes}`,
  };
  await firestoreService.addInteraction(userId, initialInteraction);

  return { success: true, contactId, contact: { ...contact, id: contactId } };
}

async function executeAddInteraction(
  userId: string,
  contacts: Contact[],
  args: ToolArguments
): Promise<{ success: boolean; interactionId?: string; error?: string }> {
  const contact = findContact(contacts, args as { contactId?: string; contactName?: string });
  if (!contact) {
    return { success: false, error: 'Contact not found' };
  }

  const interaction: Omit<Interaction, 'id'> = {
    contactId: contact.id,
    type: args.type as InteractionType,
    notes: args.notes as string,
    date: (args.date as string) || new Date().toISOString().split('T')[0]
  };

  const interactionId = await firestoreService.addInteraction(userId, interaction);

  await firestoreService.updateContact(userId, contact.id, {
    lastContacted: interaction.date
  });

  return { success: true, interactionId };
}

async function executeAddTask(
  userId: string,
  contacts: Contact[],
  args: ToolArguments
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  let contactId: string | undefined;
  if (args.contactId || args.contactName) {
    const contact = findContact(contacts, args as { contactId?: string; contactName?: string });
    if (contact) {
      contactId = contact.id;
    }
  }

  const task: Omit<Task, 'id'> = {
    title: args.title as string,
    completed: false,
    priority: (args.priority as 'low' | 'medium' | 'high') || 'medium',
    frequency: (args.frequency as Task['frequency']) || 'none'
  };

  if (args.description) {
    task.description = args.description as string;
  }
  if (contactId) {
    task.contactId = contactId;
  }
  if (args.dueDate) {
    task.dueDate = args.dueDate as string;
  }
  if (args.dueTime) {
    task.dueTime = args.dueTime as string;
  }

  const taskId = await firestoreService.addTask(userId, task);
  return { success: true, taskId };
}

async function executeUpdateContact(
  userId: string,
  contacts: Contact[],
  args: ToolArguments
): Promise<{ success: boolean; error?: string }> {
  const contact = findContact(contacts, args as { contactId?: string; contactName?: string });
  if (!contact) {
    return { success: false, error: 'Contact not found' };
  }

  const updates = args.updates as Partial<Contact> & { relatedContactNames?: string[] };

  if (updates.relatedContactNames && updates.relatedContactNames.length > 0) {
    const newRelatedIds = resolveContactNames(contacts, updates.relatedContactNames);
    const existingIds = contact.relatedContactIds || [];
    const mergedIds = [...new Set([...existingIds, ...newRelatedIds])];
    updates.relatedContactIds = mergedIds;

    for (const relatedId of newRelatedIds) {
      if (!existingIds.includes(relatedId)) {
        const relatedContact = contacts.find(c => c.id === relatedId);
        if (relatedContact) {
          const updatedRelatedIds = [...new Set([...(relatedContact.relatedContactIds || []), contact.id])];
          await firestoreService.updateContact(userId, relatedId, { relatedContactIds: updatedRelatedIds });
        }
      }
    }

    delete updates.relatedContactNames;
  }

  await firestoreService.updateContact(userId, contact.id, updates);
  return { success: true };
}

async function executeUpdateTask(
  userId: string,
  tasks: Task[],
  args: ToolArguments
): Promise<{ success: boolean; error?: string }> {
  const task = findTask(tasks, args as { taskId?: string; taskTitle?: string });
  if (!task) {
    return { success: false, error: 'Task not found' };
  }

  const updates = args.updates as Partial<Task>;
  await firestoreService.updateTask(userId, task.id, updates);
  return { success: true };
}

// Main executor function
export async function executeToolCall(
  toolCall: ToolCall,
  context: ToolExecutorContext
): Promise<ToolResult> {
  const { userId, data } = context;
  const { contacts, interactions, tasks } = data;
  const args = toolCall.arguments;

  try {
    let result: unknown;

    switch (toolCall.name) {
      case 'searchContacts':
        result = executeSearchContacts(contacts, args);
        break;
      case 'getContactDetails':
        result = executeGetContactDetails(contacts, interactions, tasks, args);
        break;
      case 'searchInteractions':
        result = executeSearchInteractions(contacts, interactions, args);
        break;
      case 'searchTasks':
        result = executeSearchTasks(contacts, tasks, args);
        break;
      case 'getStats':
        result = executeGetStats(data, args);
        break;
      case 'addContact':
        result = await executeAddContact(userId, contacts, args);
        break;
      case 'addInteraction':
        result = await executeAddInteraction(userId, contacts, args);
        break;
      case 'addTask':
        result = await executeAddTask(userId, contacts, args);
        break;
      case 'updateContact':
        result = await executeUpdateContact(userId, contacts, args);
        break;
      case 'updateTask':
        result = await executeUpdateTask(userId, tasks, args);
        break;
      default:
        return {
          toolCallId: toolCall.id,
          name: toolCall.name,
          result: { error: `Unknown tool: ${toolCall.name}` },
          success: false,
          error: `Unknown tool: ${toolCall.name}`
        };
    }

    return {
      toolCallId: toolCall.id,
      name: toolCall.name,
      result,
      success: true
    };
  } catch (error) {
    return {
      toolCallId: toolCall.id,
      name: toolCall.name,
      result: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Format tool results for display
export function formatToolResultForDisplay(result: ToolResult, contacts: Contact[]): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  const data = result.result;

  if (Array.isArray(data)) {
    if (data.length === 0) return 'No results found.';

    if ('firstName' in data[0]) {
      return `Found ${data.length} contact(s):\n${data.map((c: Contact) =>
        `• ${c.firstName} ${c.lastName} (${c.company || 'No company'}) - ${c.status}`
      ).join('\n')}`;
    }

    if ('notes' in data[0] && 'type' in data[0]) {
      return `Found ${data.length} interaction(s):\n${data.map((i: Interaction) => {
        const contact = contacts.find(c => c.id === i.contactId);
        const contactName = contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown';
        return `• ${i.date}: ${i.type} with ${contactName} - ${i.notes.substring(0, 50)}...`;
      }).join('\n')}`;
    }

    if ('title' in data[0] && 'priority' in data[0]) {
      return `Found ${data.length} task(s):\n${data.map((t: Task) =>
        `• ${t.completed ? '✓' : '○'} ${t.title} (${t.priority}${t.dueDate ? `, due: ${t.dueDate}` : ''})`
      ).join('\n')}`;
    }
  }

  if (typeof data === 'object' && data !== null) {
    if ('contact' in data && 'recentInteractions' in data) {
      const d = data as { contact: Contact; recentInteractions: Interaction[]; pendingTasks: Task[] };
      return `Contact: ${d.contact.firstName} ${d.contact.lastName}\n` +
        `Company: ${d.contact.company || 'N/A'}\n` +
        `Position: ${d.contact.position || 'N/A'}\n` +
        `Status: ${d.contact.status}\n` +
        `Tags: ${d.contact.tags.join(', ') || 'None'}\n` +
        `Recent Interactions: ${d.recentInteractions.length}\n` +
        `Pending Tasks: ${d.pendingTasks.length}`;
    }

    if ('success' in data && (data as { success: boolean }).success) {
      if ('contactId' in data) return `Contact created successfully!`;
      if ('interactionId' in data) return `Interaction logged successfully!`;
      if ('taskId' in data) return `Task created successfully!`;
      return 'Operation completed successfully!';
    }

    return JSON.stringify(data, null, 2);
  }

  return String(data);
}
