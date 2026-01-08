import { ToolDefinition } from './types';

export const CRM_TOOLS: ToolDefinition[] = [
  // Query Tools
  {
    name: 'searchContacts',
    description: 'Search contacts by name, company, email, tags, or status. Use this to find contact information. For interaction history (meetings, calls, emails), use searchInteractions instead.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search term to match against name, company, email, or tags'
        },
        status: {
          type: 'string',
          enum: ['active', 'drifting', 'lost', 'all'],
          description: 'Filter by contact status'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags (matches any)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)'
        }
      }
    }
  },
  {
    name: 'getContactDetails',
    description: 'Get full details of a specific contact including their recent interactions and tasks',
    parameters: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'The ID of the contact to retrieve'
        },
        contactName: {
          type: 'string',
          description: 'The name of the contact (used if ID is not known)'
        }
      }
    }
  },
  {
    name: 'searchInteractions',
    description: 'Search interaction history (meetings, calls, emails, coffee chats, events). Use this when asked about past activities, conversations, or "what did I do with someone". Can filter by contact name, type, date range, or content.',
    parameters: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'Filter by contact ID'
        },
        contactName: {
          type: 'string',
          description: 'Filter by contact name'
        },
        type: {
          type: 'string',
          enum: ['Meeting', 'Call', 'Email', 'Coffee', 'Event', 'Other'],
          description: 'Filter by interaction type'
        },
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Start date for date range filter (YYYY-MM-DD)'
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'End date for date range filter (YYYY-MM-DD)'
        },
        query: {
          type: 'string',
          description: 'Search term to match in interaction notes'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 20)'
        }
      }
    }
  },
  {
    name: 'searchTasks',
    description: 'Search tasks by status, priority, contact, or due date',
    parameters: {
      type: 'object',
      properties: {
        completed: {
          type: 'boolean',
          description: 'Filter by completion status'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Filter by priority level'
        },
        contactId: {
          type: 'string',
          description: 'Filter by linked contact ID'
        },
        contactName: {
          type: 'string',
          description: 'Filter by linked contact name'
        },
        dueBefore: {
          type: 'string',
          format: 'date',
          description: 'Tasks due before this date (YYYY-MM-DD)'
        },
        dueAfter: {
          type: 'string',
          format: 'date',
          description: 'Tasks due after this date (YYYY-MM-DD)'
        },
        overdue: {
          type: 'boolean',
          description: 'If true, only show overdue tasks'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 20)'
        }
      }
    }
  },
  {
    name: 'getStats',
    description: 'Get CRM statistics and metrics for analytics. Use metric="all" to get a comprehensive overview in a single call (recommended for general stats questions).',
    parameters: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          enum: ['all', 'overview', 'interactionsByType', 'contactsByStatus', 'upcomingBirthdays', 'overdueTasks', 'recentActivity'],
          description: 'The type of statistic to retrieve. Use "all" for comprehensive stats in one call.'
        }
      },
      required: ['metric']
    }
  },

  // Create Tools (NO DELETE OPERATIONS)
  {
    name: 'addContact',
    description: 'Create a new contact in the CRM. Returns the created contact.',
    parameters: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          description: 'First name of the contact'
        },
        lastName: {
          type: 'string',
          description: 'Last name of the contact'
        },
        email: {
          type: 'string',
          description: 'Email address'
        },
        phone: {
          type: 'string',
          description: 'Phone number'
        },
        company: {
          type: 'string',
          description: 'Company or organization name'
        },
        position: {
          type: 'string',
          description: 'Job title or position'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to categorize the contact'
        },
        notes: {
          type: 'string',
          description: 'Initial notes about the contact - include how you met, mutual connections, shared history'
        },
        birthday: {
          type: 'string',
          description: 'Birthday in MM-DD format'
        },
        relatedContactNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Names of related contacts (e.g., mutual friends, colleagues, introduced by). The system will look up their IDs.'
        }
      },
      required: ['firstName', 'lastName']
    }
  },
  {
    name: 'addInteraction',
    description: 'Log a new interaction (meeting, call, email, etc.) with a contact',
    parameters: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'ID of the contact'
        },
        contactName: {
          type: 'string',
          description: 'Name of the contact (used if ID not known)'
        },
        type: {
          type: 'string',
          enum: ['Meeting', 'Call', 'Email', 'Coffee', 'Event', 'Other'],
          description: 'Type of interaction'
        },
        notes: {
          type: 'string',
          description: 'Notes about the interaction'
        },
        date: {
          type: 'string',
          format: 'date',
          description: 'Date of the interaction (YYYY-MM-DD). Defaults to today.'
        }
      },
      required: ['type', 'notes']
    }
  },
  {
    name: 'addTask',
    description: 'Create a new task or reminder, optionally linked to a contact. Use this for both tasks AND reminders - they are the same thing in this system.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the task/reminder'
        },
        description: {
          type: 'string',
          description: 'Detailed description of the task'
        },
        contactId: {
          type: 'string',
          description: 'ID of the linked contact'
        },
        contactName: {
          type: 'string',
          description: 'Name of the linked contact (used if ID not known)'
        },
        dueDate: {
          type: 'string',
          format: 'date',
          description: 'Due date (YYYY-MM-DD). Required for reminders with specific times.'
        },
        dueTime: {
          type: 'string',
          description: 'Due time in 24-hour format (HH:MM). Use this for time-specific reminders like "in 5 minutes" or "at 3pm". The notification will trigger at this time.'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Priority level. Use "high" for time-sensitive reminders within the next few hours.'
        },
        frequency: {
          type: 'string',
          enum: ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'],
          description: 'Recurring frequency (default: none)'
        }
      },
      required: ['title']
    }
  },

  // Update Tools
  {
    name: 'updateContact',
    description: 'Update an existing contact\'s information',
    parameters: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'ID of the contact to update'
        },
        contactName: {
          type: 'string',
          description: 'Name of the contact (used if ID not known)'
        },
        updates: {
          type: 'object',
          description: 'Fields to update',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            company: { type: 'string' },
            position: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            notes: { type: 'string' },
            birthday: { type: 'string', description: 'Birthday in MM-DD format' },
            status: { type: 'string', enum: ['active', 'drifting', 'lost'] },
            relatedContactNames: {
              type: 'array',
              items: { type: 'string' },
              description: 'Names of related contacts to link. The system will look up their IDs.'
            }
          }
        }
      },
      required: ['updates']
    }
  },
  {
    name: 'updateTask',
    description: 'Update a task (mark complete, change priority, reschedule, etc.)',
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'ID of the task to update'
        },
        taskTitle: {
          type: 'string',
          description: 'Title of the task (used if ID not known)'
        },
        updates: {
          type: 'object',
          description: 'Fields to update',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            completed: { type: 'boolean' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            dueDate: { type: 'string', format: 'date' }
          }
        }
      },
      required: ['updates']
    }
  }
];

// Note: No delete tools are included for safety
// Users must use the UI to delete contacts, interactions, or tasks
