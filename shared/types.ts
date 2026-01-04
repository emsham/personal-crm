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
