import React, { useRef, useEffect, useState } from 'react';
import { History, Sparkles } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { useLLMSettings } from '../../contexts/LLMSettingsContext';
import { Contact } from '../../types';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import ChatHistorySidebar from './ChatHistorySidebar';
import LLMSettingsModal from './LLMSettingsModal';

interface ChatPanelProps {
  contacts: Contact[];
}

const ChatPanel: React.FC<ChatPanelProps> = ({ contacts }) => {
  const { currentSession, sidebarOpen, toggleSidebar, error, clearError } = useChat();
  const { currentProviderConfigured } = useLLMSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = currentSession?.messages || [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Open settings automatically if not configured
  useEffect(() => {
    if (!currentProviderConfigured && messages.length === 0) {
      // Only auto-open on first load
    }
  }, [currentProviderConfigured]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg shadow-indigo-500/20">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">AI Assistant</h2>
            <p className="text-xs text-slate-500">Ask about your contacts or manage your CRM</p>
          </div>
        </div>
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <History size={16} />
          <span className="hidden sm:inline">History</span>
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={clearError}
            className="text-red-500 hover:text-red-700 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <EmptyState onOpenSettings={() => setSettingsOpen(true)} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} contacts={contacts} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-4 py-4 border-t border-slate-100 bg-slate-50">
        <ChatInput onOpenSettings={() => setSettingsOpen(true)} />
      </div>

      {/* Sidebar */}
      <ChatHistorySidebar isOpen={sidebarOpen} onClose={toggleSidebar} />

      {/* Settings Modal */}
      <LLMSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

// Empty state component
const EmptyState: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const { currentProviderConfigured, settings } = useLLMSettings();

  const suggestions = [
    "Who haven't I contacted in a while?",
    "Show me my high priority tasks",
    "Find contacts at Google",
    "Add a meeting with John tomorrow",
    "What's my CRM overview?",
    "Show contacts tagged as 'investor'",
  ];

  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <div className="inline-flex p-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-6">
        <Sparkles size={40} className="text-indigo-600" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-2">
        Welcome to your AI CRM Assistant
      </h3>
      <p className="text-slate-500 mb-8 max-w-md mx-auto">
        {currentProviderConfigured
          ? "Ask me anything about your contacts, interactions, or tasks. I can also help you add new data to your CRM."
          : "Configure your API key to start chatting with your CRM data."}
      </p>

      {!currentProviderConfigured && (
        <button
          onClick={onOpenSettings}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 mb-8"
        >
          <Sparkles size={18} />
          Configure AI Provider
        </button>
      )}

      {currentProviderConfigured && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 uppercase tracking-wider font-medium">
            Try asking
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion, index) => (
              <SuggestionChip key={index} text={suggestion} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Suggestion chip component
const SuggestionChip: React.FC<{ text: string }> = ({ text }) => {
  const { sendMessage } = useChat();

  const handleClick = () => {
    sendMessage(text);
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm"
    >
      {text}
    </button>
  );
};

export default ChatPanel;
