// Shared AI types for web and mobile apps

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

// Streaming chunk types
export interface LLMStreamChunk {
  type: 'text' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolCall?: ToolCall;
  error?: string;
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

// CRM Data types needed for AI context
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
  birthday?: string;
}

export interface Interaction {
  id: string;
  contactId: string;
  date: string;
  type: 'Meeting' | 'Call' | 'Email' | 'Coffee' | 'Event' | 'Other';
  notes: string;
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

export interface CRMData {
  contacts: Contact[];
  interactions: Interaction[];
  tasks: Task[];
}
