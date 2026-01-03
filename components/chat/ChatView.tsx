import React, { useRef, useEffect, useState } from 'react';
import { Send, Settings, Loader2, LayoutDashboard, X, Plus, Bot, Sparkles } from 'lucide-react';
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
  } = useChat();
  const { currentProviderConfigured, settings } = useLLMSettings();

  const messages = currentSession?.messages || [];
  const hasMessages = messages.length > 0;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (hasMessages && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [hasMessages, messages]);

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

      {/* Top bar */}
      <div className={`
        relative z-20 flex-shrink-0 flex items-center justify-between px-6 py-3
        transition-all duration-300
        ${hasMessages ? 'border-b border-white/5 bg-black/20 backdrop-blur-xl' : ''}
      `}>
        <div className="flex items-center gap-4">
          {hasMessages && (
            <>
              <div className="h-4 w-px bg-white/10" />
              <select
                value={currentSession?.id || ''}
                onChange={(e) => e.target.value && selectSession(e.target.value)}
                className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-slate-400 focus:outline-none hover:bg-white/10 transition-colors cursor-pointer"
              >
                {sessions.length === 0 ? (
                  <option value="">New Chat</option>
                ) : (
                  sessions.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))
                )}
              </select>
              <button
                onClick={createNewSession}
                className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <Plus size={16} />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onShowDashboard}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <LayoutDashboard size={14} />
            <span className="hidden sm:inline">Dashboard</span>
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
          <div className="h-full flex items-center justify-center px-6">
            <div className="w-full max-w-2xl">
              {/* The AI Card */}
              <div className="glass-strong rounded-3xl p-8 shadow-2xl shadow-violet-500/5 border border-white/10">
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
                      relative flex items-end gap-3 p-3 rounded-xl transition-all duration-200
                      ${isFocused ? 'bg-white/10 ring-2 ring-violet-500/40' : 'bg-white/5 hover:bg-white/[0.07]'}
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
                        className="flex-1 resize-none bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm py-1.5"
                        style={{ maxHeight: '100px' }}
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
                />
              ))}
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
              relative flex items-end gap-3 p-3 rounded-xl transition-all duration-200
              ${isFocused ? 'bg-white/10 ring-1 ring-violet-500/30' : 'bg-white/5'}
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
                className="flex-1 resize-none bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm py-1.5"
                style={{ maxHeight: '100px' }}
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
