import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Send, Settings, Loader2, LayoutDashboard, X, Plus, Bot, Sparkles, History, MessageSquare, Search, Clock, Zap } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { useLLMSettings } from '../../contexts/LLMSettingsContext';
import { Contact, Task } from '../../types';
import ChatMessage from './ChatMessage';
import LLMSettingsModal from './LLMSettingsModal';
import { LoadingDots } from '../ui';

interface ChatViewProps {
  contacts: Contact[];
  tasks: Task[];
  onShowDashboard: () => void;
  onSelectContact?: (contact: Contact, fromChat?: boolean) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ contacts, tasks, onShowDashboard, onSelectContact }) => {
  const [input, setInput] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
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
    stopStreaming,
  } = useChat();
  const { currentProviderConfigured, settings } = useLLMSettings();

  // Use messages directly from session - memoization happens at message component level
  const messages = currentSession?.messages || [];
  const hasMessages = messages.length > 0;

  // Stop streaming when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      if (isStreaming) {
        stopStreaming();
      }
    };
  }, [isStreaming, stopStreaming]);

  // Track message count to only auto-scroll on new messages
  const prevMessageCountRef = useRef(0);

  // Auto-scroll to bottom only when new messages are added or content is streaming
  useEffect(() => {
    if (hasMessages && messagesEndRef.current) {
      const currentCount = messages.length;
      const lastMessage = messages[messages.length - 1];
      const isStreaming = lastMessage?.isStreaming;

      // Only scroll if: new message added OR currently streaming
      if (currentCount > prevMessageCountRef.current || isStreaming) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      prevMessageCountRef.current = currentCount;
    }
  }, [hasMessages, messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
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
    { text: "Who needs my attention?", icon: "👋" },
    { text: "Show high priority tasks", icon: "🎯" },
    { text: "Find investors in my network", icon: "🔍" },
    { text: "Give me a CRM overview", icon: "📊" },
  ];

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden relative">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px]" />
      </div>

      {/* Memory Panel (History Drawer) */}
      {historyOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => { setHistoryOpen(false); setHistorySearch(''); }}
          />
          <div className="fixed right-0 top-0 h-full w-80 glass-strong border-l border-white/10 shadow-2xl z-50 flex flex-col animate-slide-in-from-right">
            {/* Header */}
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Clock size={16} className="text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Memory</h3>
                    <p className="text-[10px] text-slate-500">{sessions.length} conversations</p>
                  </div>
                </div>
                <button
                  onClick={() => { setHistoryOpen(false); setHistorySearch(''); }}
                  className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 input-dark rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-2">
              {sessions
                .filter(s =>
                  historySearch === '' ||
                  s.title.toLowerCase().includes(historySearch.toLowerCase()) ||
                  s.messages.some(m => m.content?.toLowerCase().includes(historySearch.toLowerCase()))
                )
                .map((session) => (
                  <button
                    key={session.id}
                    onClick={() => { selectSession(session.id); setHistoryOpen(false); setHistorySearch(''); }}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all mb-1 ${
                      currentSession?.id === session.id
                        ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/10 border border-violet-500/30'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      currentSession?.id === session.id
                        ? 'bg-gradient-to-br from-violet-500 to-cyan-500'
                        : 'bg-white/5'
                    }`}>
                      <MessageSquare size={14} className={currentSession?.id === session.id ? 'text-white' : 'text-slate-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{session.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{session.messages.length} messages</p>
                    </div>
                  </button>
                ))}
              {sessions.filter(s =>
                historySearch === '' ||
                s.title.toLowerCase().includes(historySearch.toLowerCase()) ||
                s.messages.some(m => m.content?.toLowerCase().includes(historySearch.toLowerCase()))
              ).length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No conversations found
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Top bar */}
      <div className={`
        relative z-20 flex-shrink-0 flex items-center justify-between px-6 py-3
        transition-all duration-300
        ${hasMessages ? 'bg-black/20 backdrop-blur-xl' : ''}
      `}>
        <div className="flex items-center gap-3 ml-14 lg:ml-0">
          {/* New Session button - always visible, add left margin on mobile to avoid hamburger */}
          <button
            onClick={createNewSession}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-all border border-violet-500/20"
          >
            <Zap size={14} />
            <span>New Insight</span>
          </button>

          {/* Memory button - only when there are sessions */}
          {sessions.length > 0 && (
            <button
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <Clock size={14} />
              <span>Memory</span>
              <span className="px-1.5 py-0.5 bg-white/10 text-slate-400 text-[10px] font-bold rounded-md">
                {sessions.length}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onShowDashboard}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <LayoutDashboard size={14} />
            <span className="hidden sm:inline">Widgets</span>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className={`p-1.5 rounded-lg transition-all ${
              !currentProviderConfigured
                ? 'text-amber-400 bg-amber-500/10 animate-pulse'
                : 'text-slate-500 hover:text-white hover:bg-white/10'
            }`}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="relative z-20 flex-shrink-0 mx-6 mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
          <span className="text-sm text-red-400">{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300 p-1 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 min-h-0 overflow-y-auto relative z-10">
        {!hasMessages ? (
          /* ============ CONTAINED AI BOX ============ */
          <div className="h-full flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-2xl max-h-full overflow-y-auto">
              {/* The AI Card */}
              <div className="glass-strong rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl shadow-violet-500/5 border border-white/10">
                {/* AI Avatar */}
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 -m-4 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 opacity-20 blur-2xl" />
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-violet-500/30 animate-float">
                      <Bot size={36} className="text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/50">
                      <Sparkles size={12} className="text-white" />
                    </div>
                  </div>
                </div>

                {/* Welcome text */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    What can I help you with?
                  </h2>
                  <p className="text-slate-400">
                    {currentProviderConfigured
                      ? "Ask me anything about your network."
                      : "Configure your AI provider to get started."}
                  </p>
                </div>

                {/* Input area */}
                {currentProviderConfigured ? (
                  <form onSubmit={handleSubmit}>
                    <div className={`
                      relative flex items-end gap-3 p-3 rounded-xl transition-colors duration-200
                      ${isFocused ? 'bg-white/10' : 'bg-white/5 hover:bg-white/[0.07]'}
                    `}>
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="Ask me anything..."
                        rows={1}
                        autoComplete="off"
                        className="flex-1 resize-none bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm py-2 min-h-[40px]"
                        style={{ maxHeight: '100px', outline: 'none', boxShadow: 'none', WebkitAppearance: 'none' }}
                      />
                      <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className={`
                          p-2.5 rounded-lg transition-all flex-shrink-0
                          ${isLoading || !input.trim()
                            ? 'text-slate-600'
                            : 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25'}
                        `}
                      >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      </button>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 mt-3 text-[11px] text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                      <span>Powered by {settings.provider === 'gemini' ? 'Gemini' : 'OpenAI'}</span>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all group"
                  >
                    <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                    Configure AI Provider
                  </button>
                )}
              </div>

              {/* Suggestions */}
              {currentProviderConfigured && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s.text)}
                      className="group flex items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all text-left"
                    >
                      <span className="text-base">{s.icon}</span>
                      <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">{s.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ============ CONVERSATION STATE ============ */
          <div className="max-w-4xl mx-auto px-6 py-6">
            <div className="space-y-6">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  contacts={contacts}
                  isLatest={index === messages.length - 1}
                  isStreaming={isStreaming && index === messages.length - 1}
                  onSelectContact={(contact) => onSelectContact?.(contact, true)}
                />
              ))}

              {/* Processing indicator - shows between tool results and follow-up */}
              {(isLoading || isStreaming) && messages.length > 0 && messages[messages.length - 1].role === 'tool' && (
                <div className="pl-11 animate-in">
                  <LoadingDots label="Thinking..." />
                </div>
              )}
            </div>
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Bottom input - only when has messages */}
      {hasMessages && (
        <div className="relative z-20 flex-shrink-0 border-t border-white/5 bg-black/30 backdrop-blur-xl p-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className={`
              relative flex items-end gap-3 p-3 rounded-xl transition-colors duration-200
              ${isFocused ? 'bg-white/10' : 'bg-white/5'}
            `}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Continue the conversation..."
                disabled={!currentProviderConfigured}
                rows={1}
                autoComplete="off"
                className="flex-1 resize-none bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm py-1.5"
                style={{ maxHeight: '100px', outline: 'none', boxShadow: 'none', WebkitAppearance: 'none' }}
              />
              <button
                type="submit"
                disabled={!currentProviderConfigured || isLoading || !input.trim()}
                className={`
                  p-2.5 rounded-lg transition-all flex-shrink-0
                  ${!currentProviderConfigured || isLoading || !input.trim()
                    ? 'text-slate-600'
                    : 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white'}
                `}
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </form>
        </div>
      )}

      <LLMSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default ChatView;
