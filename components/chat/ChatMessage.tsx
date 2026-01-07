import React, { memo, useRef, useEffect, useState } from 'react';
import { ChatMessage as ChatMessageType, ToolResult, Contact, Interaction, Task } from '../../types';
import { Bot, Wrench, AlertCircle, CheckCircle, Sparkles, ArrowUpRight, Loader2 } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
  contacts?: Contact[];
  isLatest?: boolean;
  onSelectContact?: (contact: Contact) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = memo(({ message, contacts = [], isLatest = false, onSelectContact }) => {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';
  // Use ref to track animation without causing re-renders
  const hasAnimatedRef = useRef(false);
  const [, forceUpdate] = useState(0);
  const contentRef = useRef<string>('');

  // Mark as animated after first render - only triggers one re-render
  useEffect(() => {
    if (!hasAnimatedRef.current) {
      // Small delay to ensure animation plays before removing class
      const timer = setTimeout(() => {
        hasAnimatedRef.current = true;
        forceUpdate(n => n + 1);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  // Keep content stable - only update ref, don't cause re-render flashes
  if (message.content) {
    contentRef.current = message.content;
  }

  const shouldAnimate = !hasAnimatedRef.current;

  if (isTool && message.toolResults) {
    return <ToolResultsDisplay results={message.toolResults} contacts={contacts} hasAnimated={hasAnimatedRef.current} onSelectContact={onSelectContact} />;
  }

  // User message - minimal, right-aligned
  if (isUser) {
    return (
      <div className={`flex justify-end ${shouldAnimate ? 'animate-slide-in-from-bottom-2' : ''}`}>
        <div className="max-w-[70%] px-5 py-3 rounded-2xl rounded-br-md bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/20">
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  // AI message - full-width, content-like
  return (
    <div className={shouldAnimate ? 'animate-slide-in-from-bottom-4' : ''}>
      {/* AI response header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Bot size={16} className="text-white" />
        </div>
        <span className="text-sm font-medium text-slate-400">tethru AI</span>
        {message.isStreaming && (
          <div className="flex items-center gap-1.5 text-xs text-violet-400">
            <Sparkles size={12} className="animate-pulse" />
            <span>Generating...</span>
          </div>
        )}
      </div>

      {/* AI response content */}
      <div className="pl-11">
        {message.isStreaming && !message.content ? (
          <ThinkingIndicator />
        ) : (
          <div className="text-slate-200 text-[15px] leading-relaxed whitespace-pre-wrap">
            {message.content || contentRef.current}
            {message.isStreaming && (
              <span className="inline-block w-0.5 h-4 ml-0.5 bg-violet-400 animate-pulse align-middle" />
            )}
          </div>
        )}

        {/* Tool calls indicator - show with animation */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {message.toolCalls.map((tc, i) => (
              <div
                key={tc.id || i}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 text-xs text-violet-300 animate-scale-in"
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
              >
                {message.isStreaming ? (
                  <Loader2 size={12} className="animate-spin text-violet-400" />
                ) : (
                  <CheckCircle size={12} className="text-emerald-400" />
                )}
                <span>{formatToolName(tc.name)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render when necessary
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.message.isStreaming !== nextProps.message.isStreaming) return false;
  if (prevProps.message.content !== nextProps.message.content) return false;
  if (prevProps.message.toolResults !== nextProps.message.toolResults) return false;
  return true;
});

// Premium thinking indicator
const ThinkingIndicator: React.FC = () => (
  <div className="flex items-center gap-3">
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
    <span className="text-sm text-slate-500">Processing your request...</span>
  </div>
);

// Format tool name for display
function formatToolName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .replace(/^./, s => s.toUpperCase());
}

// Tool results display component
const ToolResultsDisplay: React.FC<{ results: ToolResult[]; contacts: Contact[]; hasAnimated: boolean; onSelectContact?: (contact: Contact) => void }> = memo(({
  results,
  contacts,
  hasAnimated,
  onSelectContact,
}) => {
  return (
    <div className="pl-11 space-y-3">
      {results.map((result, index) => (
        <div
          key={index}
          className={`${!hasAnimated ? 'animate-fade-in-up' : ''}`}
          style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
        >
          <ToolResultCard result={result} contacts={contacts} onSelectContact={onSelectContact} />
        </div>
      ))}
    </div>
  );
});

const ToolResultCard: React.FC<{ result: ToolResult; contacts: Contact[]; onSelectContact?: (contact: Contact) => void }> = memo(({
  result,
  contacts,
  onSelectContact,
}) => {
  const data = result.result;

  if (!result.success) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
        <AlertCircle size={16} />
        <span className="text-sm">{result.error || 'Operation failed'}</span>
      </div>
    );
  }

  // Handle different result types
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div className="px-4 py-3 rounded-xl glass text-slate-400 text-sm">
          No results found
        </div>
      );
    }

    // Contacts array
    if ('firstName' in data[0]) {
      return (
        <div className="rounded-2xl glass-light overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <span className="text-xs font-medium text-slate-400">
              {data.length} contact{data.length !== 1 ? 's' : ''} found
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {(data as Contact[]).slice(0, 5).map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group cursor-pointer"
                onClick={() => onSelectContact?.(contact)}
              >
                <div className="w-10 h-10 rounded-xl bg-black ring-2 ring-white/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {contact.firstName?.charAt(0).toUpperCase() || ''}{contact.lastName?.charAt(0).toUpperCase() || ''}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors truncate">
                    {contact.firstName} {contact.lastName}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {contact.company || contact.email}
                  </div>
                </div>
                <span className={`
                  px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-lg
                  ${contact.status === 'active' ? 'status-active' :
                    contact.status === 'drifting' ? 'status-drifting' : 'status-lost'}
                `}>
                  {contact.status}
                </span>
                <ArrowUpRight size={14} className="text-slate-600 group-hover:text-violet-400 transition-colors" />
              </div>
            ))}
            {data.length > 5 && (
              <div className="px-4 py-3 text-xs text-slate-500 bg-white/5">
                +{data.length - 5} more contacts
              </div>
            )}
          </div>
        </div>
      );
    }

    // Tasks array
    if ('title' in data[0] && 'priority' in data[0]) {
      return (
        <div className="rounded-2xl glass-light overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <span className="text-xs font-medium text-slate-400">
              {data.length} task{data.length !== 1 ? 's' : ''} found
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {(data as Task[]).slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                <div className={`
                  w-5 h-5 rounded-lg flex items-center justify-center border-2
                  ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}
                `}>
                  {task.completed && <CheckCircle size={12} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${task.completed ? 'text-slate-500 line-through' : 'text-white'}`}>
                    {task.title}
                  </div>
                  {task.dueDate && (
                    <div className="text-xs text-slate-500">Due: {task.dueDate}</div>
                  )}
                </div>
                <span className={`
                  px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-lg
                  ${task.priority === 'high' ? 'text-rose-400 bg-rose-500/10' :
                    task.priority === 'medium' ? 'text-amber-400 bg-amber-500/10' :
                    'text-slate-400 bg-white/5'}
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
        <div className="rounded-2xl glass-light overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <span className="text-xs font-medium text-slate-400">
              {data.length} interaction{data.length !== 1 ? 's' : ''} found
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {(data as Interaction[]).slice(0, 5).map((interaction) => {
              const contact = contacts.find(c => c.id === interaction.contactId);
              return (
                <div key={interaction.id} className="p-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 font-medium">
                      {interaction.type}
                    </span>
                    <span>{interaction.date}</span>
                    {contact && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span>{contact.firstName} {contact.lastName}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-2">{interaction.notes}</p>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  }

  // Object results
  if (typeof data === 'object' && data !== null) {
    // Contact details
    if ('contact' in data && 'recentInteractions' in data) {
      const d = data as { contact: Contact; recentInteractions: Interaction[]; pendingTasks: Task[] };
      return (
        <div className="rounded-2xl overflow-hidden glass-light">
          <div className="p-5 bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-black ring-2 ring-white/20 shadow-lg flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {d.contact.firstName?.charAt(0).toUpperCase() || ''}{d.contact.lastName?.charAt(0).toUpperCase() || ''}
                </span>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">{d.contact.firstName} {d.contact.lastName}</h4>
                <p className="text-sm text-slate-400">
                  {d.contact.position} {d.contact.company && `at ${d.contact.company}`}
                </p>
              </div>
              <span className={`
                ml-auto px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-lg
                ${d.contact.status === 'active' ? 'status-active' :
                  d.contact.status === 'drifting' ? 'status-drifting' : 'status-lost'}
              `}>
                {d.contact.status}
              </span>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {d.contact.email && (
              <div className="text-sm">
                <span className="text-slate-500">Email: </span>
                <span className="text-slate-300">{d.contact.email}</span>
              </div>
            )}
            {d.contact.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {d.contact.tags.map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 text-xs rounded-lg bg-white/5 text-slate-400 border border-white/5">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-white/5 text-center">
                <div className="text-xl font-bold text-white">{d.recentInteractions.length}</div>
                <div className="text-xs text-slate-500">Recent Interactions</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 text-center">
                <div className="text-xl font-bold text-white">{d.pendingTasks.length}</div>
                <div className="text-xs text-slate-500">Pending Tasks</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Success messages - compact inline indicator
    if ('success' in data && data.success) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <CheckCircle size={14} />
          <span className="text-xs font-medium">
            {'contactId' in data ? 'Contact added' :
             'interactionId' in data ? 'Interaction logged' :
             'taskId' in data ? 'Task created' :
             'Done'}
          </span>
        </div>
      );
    }

    // Stats overview
    if ('totalContacts' in data) {
      const stats = data as Record<string, number>;
      return (
        <div className="rounded-2xl glass-light overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <span className="text-xs font-medium text-slate-400">CRM Overview</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="p-3 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] text-center">
                <div className="text-2xl font-bold gradient-text">{value}</div>
                <div className="text-xs text-slate-500">{formatStatLabel(key)}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Generic object
    return (
      <div className="px-4 py-3 rounded-xl glass overflow-x-auto">
        <pre className="text-xs text-slate-400 whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  return null;
});

function formatStatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

export default ChatMessage;
