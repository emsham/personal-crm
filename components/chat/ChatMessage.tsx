import React from 'react';
import { ChatMessage as ChatMessageType, ToolResult, Contact, Interaction, Task } from '../../types';
import { User, Bot, Wrench, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
  contacts?: Contact[];
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, contacts = [] }) => {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  if (isTool && message.toolResults) {
    return <ToolResultsDisplay results={message.toolResults} contacts={contacts} />;
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${isUser ? 'bg-indigo-600' : 'bg-slate-700'}
      `}>
        {isUser ? (
          <User size={16} className="text-white" />
        ) : (
          <Bot size={16} className="text-white" />
        )}
      </div>

      {/* Message content */}
      <div className={`
        max-w-[80%] px-4 py-3 rounded-2xl
        ${isUser
          ? 'bg-indigo-600 text-white rounded-tr-sm'
          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
        }
      `}>
        {message.isStreaming && !message.content ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        ) : (
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
        )}

        {/* Tool calls indicator */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Wrench size={12} />
              <span>
                {message.toolCalls.map(tc => tc.name).join(', ')}
              </span>
            </div>
          </div>
        )}

        {/* Streaming indicator */}
        {message.isStreaming && message.content && (
          <span className="inline-block w-1.5 h-4 ml-0.5 bg-slate-400 animate-pulse" />
        )}
      </div>
    </div>
  );
};

// Tool results display component
const ToolResultsDisplay: React.FC<{ results: ToolResult[]; contacts: Contact[] }> = ({
  results,
  contacts,
}) => {
  return (
    <div className="space-y-2 ml-11">
      {results.map((result, index) => (
        <ToolResultCard key={index} result={result} contacts={contacts} />
      ))}
    </div>
  );
};

const ToolResultCard: React.FC<{ result: ToolResult; contacts: Contact[] }> = ({
  result,
  contacts,
}) => {
  const data = result.result;

  if (!result.success) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        <AlertCircle size={14} />
        <span>{result.error || 'Operation failed'}</span>
      </div>
    );
  }

  // Handle different result types
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-sm">
          No results found
        </div>
      );
    }

    // Contacts array
    if ('firstName' in data[0]) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
            {data.length} contact{data.length !== 1 ? 's' : ''} found
          </div>
          <div className="divide-y divide-slate-100">
            {(data as Contact[]).slice(0, 5).map((contact) => (
              <div key={contact.id} className="flex items-center gap-3 px-3 py-2">
                <img
                  src={contact.avatar || `https://ui-avatars.com/api/?name=${contact.firstName}+${contact.lastName}`}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {contact.firstName} {contact.lastName}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {contact.company || contact.email}
                  </div>
                </div>
                <span className={`
                  px-2 py-0.5 text-xs font-medium rounded-full
                  ${contact.status === 'active' ? 'bg-green-100 text-green-700' :
                    contact.status === 'drifting' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'}
                `}>
                  {contact.status}
                </span>
              </div>
            ))}
            {data.length > 5 && (
              <div className="px-3 py-2 text-xs text-slate-500 bg-slate-50">
                ...and {data.length - 5} more
              </div>
            )}
          </div>
        </div>
      );
    }

    // Tasks array
    if ('title' in data[0] && 'priority' in data[0]) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
            {data.length} task{data.length !== 1 ? 's' : ''} found
          </div>
          <div className="divide-y divide-slate-100">
            {(data as Task[]).slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center gap-3 px-3 py-2">
                <div className={`
                  w-5 h-5 rounded-full flex items-center justify-center border-2
                  ${task.completed
                    ? 'bg-green-500 border-green-500'
                    : 'border-slate-300'}
                `}>
                  {task.completed && <CheckCircle size={12} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${task.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                    {task.title}
                  </div>
                  {task.dueDate && (
                    <div className="text-xs text-slate-500">
                      Due: {task.dueDate}
                    </div>
                  )}
                </div>
                <span className={`
                  px-2 py-0.5 text-xs font-medium rounded-full
                  ${task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-slate-100 text-slate-700'}
                `}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Interactions array
    if ('notes' in data[0] && 'type' in data[0]) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
            {data.length} interaction{data.length !== 1 ? 's' : ''} found
          </div>
          <div className="divide-y divide-slate-100">
            {(data as Interaction[]).slice(0, 5).map((interaction) => {
              const contact = contacts.find(c => c.id === interaction.contactId);
              return (
                <div key={interaction.id} className="px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <span className="font-medium">{interaction.type}</span>
                    <span>•</span>
                    <span>{interaction.date}</span>
                    {contact && (
                      <>
                        <span>•</span>
                        <span>{contact.firstName} {contact.lastName}</span>
                      </>
                    )}
                  </div>
                  <div className="text-sm text-slate-700 line-clamp-2">
                    {interaction.notes}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  }

  // Object results (stats, contact details, etc.)
  if (typeof data === 'object' && data !== null) {
    // Contact details
    if ('contact' in data && 'recentInteractions' in data) {
      const d = data as { contact: Contact; recentInteractions: Interaction[]; pendingTasks: Task[] };
      return (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
            <div className="flex items-center gap-3">
              <img
                src={d.contact.avatar || `https://ui-avatars.com/api/?name=${d.contact.firstName}+${d.contact.lastName}`}
                alt=""
                className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
              />
              <div>
                <div className="font-semibold">{d.contact.firstName} {d.contact.lastName}</div>
                <div className="text-sm text-white/80">
                  {d.contact.position} {d.contact.company && `at ${d.contact.company}`}
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-3 text-sm">
            <div className="flex gap-4">
              <div>
                <span className="text-slate-500">Status:</span>{' '}
                <span className={`font-medium ${
                  d.contact.status === 'active' ? 'text-green-600' :
                  d.contact.status === 'drifting' ? 'text-yellow-600' : 'text-red-600'
                }`}>{d.contact.status}</span>
              </div>
              {d.contact.email && (
                <div>
                  <span className="text-slate-500">Email:</span>{' '}
                  <span className="text-slate-700">{d.contact.email}</span>
                </div>
              )}
            </div>
            {d.contact.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-500">Tags:</span>
                {d.contact.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-lg font-semibold text-slate-900">{d.recentInteractions.length}</div>
                <div className="text-xs text-slate-500">Recent Interactions</div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-lg font-semibold text-slate-900">{d.pendingTasks.length}</div>
                <div className="text-xs text-slate-500">Pending Tasks</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Success messages
    if ('success' in data && data.success) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle size={14} />
          <span>
            {'contactId' in data ? 'Contact created successfully!' :
             'interactionId' in data ? 'Interaction logged successfully!' :
             'taskId' in data ? 'Task created successfully!' :
             'Operation completed successfully!'}
          </span>
        </div>
      );
    }

    // Stats overview
    if ('totalContacts' in data) {
      const stats = data as Record<string, number>;
      return (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
            CRM Overview
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-lg font-semibold text-slate-900">{value}</div>
                <div className="text-xs text-slate-500">{formatStatLabel(key)}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Generic object display
    return (
      <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg overflow-x-auto">
        <pre className="text-xs text-slate-700 whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  return null;
};

// Helper to format stat labels
function formatStatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

export default ChatMessage;
