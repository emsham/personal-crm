import React, { useRef, useEffect, useState } from 'react';
import { Send, Settings, Loader2, LayoutDashboard, X, Sparkles, Plus, Bot, Zap } from 'lucide-react';
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
    { text: "Who haven't I contacted recently?", icon: "users" },
    { text: "Show my high priority tasks", icon: "tasks" },
    { text: "Find contacts tagged 'investor'", icon: "search" },
    { text: "What's my CRM overview?", icon: "chart" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 glass-light">
        <div className="flex items-center gap-4">
          {/* Chat session selector */}
          <div className="relative">
            <select
              value={currentSession?.id || ''}
              onChange={(e) => e.target.value && selectSession(e.target.value)}
              className="appearance-none text-sm bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-8 text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 cursor-pointer hover:bg-white/10 transition-colors"
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
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <button
            onClick={createNewSession}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all group"
            title="New chat"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onShowDashboard}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all group"
          >
            <LayoutDashboard size={16} className="group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className={`p-2 rounded-xl transition-all ${
              !currentProviderConfigured
                ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 animate-pulse'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="AI Settings"
          >
            <Settings size={18} className="hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between backdrop-blur-sm">
          <span className="text-sm text-red-400">{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="max-w-lg text-center">
              {/* AI Avatar */}
              <div className="relative inline-block mb-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                  <Bot size={40} className="text-white" />
                </div>
                <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-500 opacity-20 blur-xl animate-pulse-slow" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-dark-900 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                  <Zap size={12} className="text-white" />
                </div>
              </div>

              <h2 className="text-3xl font-bold text-white mb-3">
                How can I help you today?
              </h2>
              <p className="text-slate-400 mb-10 text-lg">
                {currentProviderConfigured
                  ? "I can help you manage contacts, track interactions, and stay on top of your network."
                  : "Configure your AI provider to get started."}
              </p>

              {!currentProviderConfigured ? (
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all group"
                >
                  <Settings size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                  Configure AI Provider
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s.text)}
                      className="px-4 py-3 glass rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-all text-left group glow-border"
                    >
                      <span className="group-hover:text-violet-300 transition-colors">{s.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} contacts={contacts} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-white/5 p-6">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className={`
            relative flex items-end gap-3 p-4 rounded-2xl transition-all
            ${!currentProviderConfigured
              ? 'bg-amber-500/5 border border-amber-500/20'
              : 'glass-strong'}
            focus-within:ring-2 focus-within:ring-violet-500/30
          `}>
            {/* Gradient border effect on focus */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/20 to-cyan-500/20 opacity-0 focus-within:opacity-100 transition-opacity -z-10 blur-xl" />

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                currentProviderConfigured
                  ? "Ask anything about your network..."
                  : "Configure AI to start chatting..."
              }
              disabled={!currentProviderConfigured}
              rows={1}
              className="flex-1 resize-none bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm py-1"
              style={{ maxHeight: '150px' }}
            />
            <button
              type="submit"
              disabled={!currentProviderConfigured || isLoading || !input.trim()}
              className={`
                p-3 rounded-xl transition-all
                ${!currentProviderConfigured || isLoading || !input.trim()
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-violet-500/25'}
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
            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>
                  Powered by {settings.provider === 'gemini' ? 'Gemini' : 'OpenAI'}
                </span>
              </div>
            </div>
          )}
        </form>
      </div>

      <LLMSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default ChatView;
