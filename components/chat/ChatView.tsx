import React, { useRef, useEffect, useState } from 'react';
import { Send, Settings, Loader2, LayoutDashboard, X, Sparkles, Plus, MessageSquare } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { useLLMSettings } from '../../contexts/LLMSettingsContext';
import { Contact, Task } from '../../types';
import ChatMessage from './ChatMessage';
import LLMSettingsModal from './LLMSettingsModal';

interface ChatViewProps {
  contacts: Contact[];
  tasks: Task[];
  onShowDashboard: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ contacts, tasks, onShowDashboard }) => {
  const [input, setInput] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    sessions,
    currentSession,
    isLoading,
    isStreaming,
    error,
    clearError,
    sendMessage,
    createNewSession,
    selectSession,
  } = useChat();
  const { currentProviderConfigured, settings } = useLLMSettings();

  const messages = currentSession?.messages || [];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;
    const message = input;
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const suggestions = [
    "Who haven't I contacted recently?",
    "Show my high priority tasks",
    "Find contacts tagged 'investor'",
    "What's my CRM overview?",
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          {/* Chat session selector */}
          <select
            value={currentSession?.id || ''}
            onChange={(e) => e.target.value && selectSession(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {sessions.length === 0 ? (
              <option value="">New Chat</option>
            ) : (
              sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))
            )}
          </select>
          <button
            onClick={createNewSession}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="New chat"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onShowDashboard}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <LayoutDashboard size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className={`p-1.5 rounded-lg transition-colors ${
              !currentProviderConfigured
                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title="AI Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-700">{error}</span>
          <button onClick={clearError} className="text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="max-w-md text-center">
              <div className="inline-flex p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl mb-6 shadow-lg">
                <Sparkles size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                How can I help you today?
              </h2>
              <p className="text-slate-500 mb-8">
                {currentProviderConfigured
                  ? "Ask me about your contacts, log interactions, or manage your tasks."
                  : "Configure your API key to start chatting."}
              </p>

              {!currentProviderConfigured ? (
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  <Settings size={18} />
                  Configure AI
                </button>
              ) : (
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} contacts={contacts} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-slate-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className={`
            flex items-end gap-3 p-3 border rounded-2xl shadow-sm
            ${!currentProviderConfigured ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}
            focus-within:border-indigo-400 focus-within:shadow-md transition-all
          `}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                currentProviderConfigured
                  ? "Ask anything about your CRM..."
                  : "Configure AI to start chatting..."
              }
              disabled={!currentProviderConfigured}
              rows={1}
              className="flex-1 resize-none bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none text-sm py-1"
              style={{ maxHeight: '150px' }}
            />
            <button
              type="submit"
              disabled={!currentProviderConfigured || isLoading || !input.trim()}
              className={`
                p-2 rounded-xl transition-colors
                ${!currentProviderConfigured || isLoading || !input.trim()
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'}
              `}
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>

          {/* Provider indicator */}
          {currentProviderConfigured && (
            <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span>
                {settings.provider === 'gemini' ? 'Gemini' : 'OpenAI'}
              </span>
            </div>
          )}
        </form>
      </div>

      <LLMSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default ChatView;
