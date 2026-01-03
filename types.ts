
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

export interface CRMState {
  contacts: Contact[];
  interactions: Interaction[];
}

export enum View {
  DASHBOARD = 'dashboard',
  CONTACTS = 'contacts',
  TASKS = 'tasks',
  ANALYTICS = 'analytics',
  SETTINGS = 'settings'
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

// LLM Chat Types
export type LLMProvider = 'gemini' | 'openai';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  success: boolean;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LLMSettings {
  provider: LLMProvider;
  geminiApiKey?: string;
  openaiApiKey?: string;
}

export interface QueryResult {
  type: 'contacts' | 'interactions' | 'tasks' | 'stats' | 'text';
  data: Contact[] | Interaction[] | Task[] | Record<string, number> | string;
  summary?: string;
}

// Tool Definition for LLM function calling
export interface ToolParameter {
  type: string;
  description?: string;
  enum?: string[];
  items?: { type: string };
  properties?: Record<string, ToolParameter>;
  required?: string[];
  default?: unknown;
  format?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}
