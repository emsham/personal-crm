// Shared types for Personal CRM - used by both web and mobile apps

export enum InteractionType {
  MEETING = 'Meeting',
  CALL = 'Call',
  EMAIL = 'Email',
  COFFEE = 'Coffee',
  EVENT = 'Event',
  OTHER = 'Other'
}

export interface Interaction {
  id: string;
  contactId: string;
  date: string;
  type: InteractionType;
  notes: string;
}

export interface ImportantDate {
  id: string;
  label: string;
  date: string; // MM-DD format for recurring dates
  year?: number; // Optional year for non-recurring dates
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  tags: string[];
  lastContacted: string | null;
  nextFollowUp: string | null;
  notes: string;
  avatar: string;
  status: 'active' | 'drifting' | 'lost';
  relatedContactIds: string[];
  birthday?: string; // MM-DD format
  importantDates?: ImportantDate[];
}

export type TaskFrequency = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Task {
  id: string;
  title: string;
  description?: string;
  contactId?: string;
  dueDate?: string;
  dueTime?: string; // HH:MM format (optional)
  reminderBefore?: number; // Minutes before to remind (optional, uses default if not set)
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  frequency: TaskFrequency;
  createdAt?: string;
}

export interface CRMState {
  contacts: Contact[];
  interactions: Interaction[];
  tasks: Task[];
}

// Chat types for AI conversations
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  toolResults?: Array<{
    toolCallId: string;
    name: string;
    result: unknown;
    success: boolean;
    error?: string;
  }>;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}
