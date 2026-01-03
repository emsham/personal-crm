import React from 'react';
import { X, Plus, MessageSquare, Trash2, Clock } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { ChatSession } from '../../types';

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({ isOpen, onClose }) => {
  const { sessions, currentSession, createNewSession, selectSession, deleteSession } = useChat();

  const handleNewChat = async () => {
    await createNewSession();
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this chat session?')) {
      await deleteSession(sessionId);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  // Group sessions by date
  const groupedSessions = sessions.reduce((groups, session) => {
    const dateKey = formatDate(session.updatedAt);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(session);
    return groups;
  }, {} as Record<string, ChatSession[]>);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full w-80 bg-white border-l border-slate-200 shadow-lg z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Chat History</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 border-b border-slate-100">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {Object.keys(groupedSessions).length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chat history yet</p>
              <p className="text-xs mt-1">Start a conversation to see it here</p>
            </div>
          ) : (
            Object.entries(groupedSessions).map(([dateKey, dateSessions]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-2 px-2 mb-2">
                  <Clock size={12} className="text-slate-400" />
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {dateKey}
                  </span>
                </div>
                <div className="space-y-1">
                  {dateSessions.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={currentSession?.id === session.id}
                      onSelect={() => selectSession(session.id)}
                      onDelete={(e) => handleDeleteSession(e, session.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const SessionItem: React.FC<SessionItemProps> = ({
  session,
  isActive,
  onSelect,
  onDelete,
}) => {
  const messageCount = session.messages.filter(m => m.role === 'user').length;

  return (
    <div
      onClick={onSelect}
      className={`
        group flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
        ${isActive
          ? 'bg-indigo-50 border border-indigo-200'
          : 'hover:bg-slate-50 border border-transparent'
        }
      `}
    >
      <MessageSquare
        size={16}
        className={`mt-0.5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}
      />
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
          {session.title}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">
          {messageCount} message{messageCount !== 1 ? 's' : ''}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
        title="Delete chat"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

export default ChatHistorySidebar;
