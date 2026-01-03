import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, Loader2, Square } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { useLLMSettings } from '../../contexts/LLMSettingsContext';

interface ChatInputProps {
  onOpenSettings: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onOpenSettings }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isLoading, isStreaming, stopStreaming } = useChat();
  const { currentProviderConfigured, settings } = useLLMSettings();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
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

  const isDisabled = !currentProviderConfigured;
  const providerLabel = settings.provider === 'gemini' ? 'Gemini' : 'OpenAI';

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className={`
          flex items-end gap-2 p-3 bg-white border rounded-2xl shadow-lg
          ${isDisabled ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}
          transition-all focus-within:border-indigo-400 focus-within:shadow-xl
        `}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isDisabled
                ? 'Configure your API key to start chatting...'
                : `Ask me anything about your contacts, or tell me to add data...`
            }
            disabled={isDisabled}
            rows={1}
            className={`
              flex-1 resize-none bg-transparent text-slate-900 placeholder-slate-400
              focus:outline-none text-sm leading-relaxed py-1 px-2
              ${isDisabled ? 'cursor-not-allowed' : ''}
            `}
            style={{ maxHeight: '200px' }}
          />

          <div className="flex items-center gap-1">
            {/* Settings button */}
            <button
              type="button"
              onClick={onOpenSettings}
              className={`
                p-2 rounded-lg transition-colors
                ${isDisabled
                  ? 'text-amber-600 bg-amber-100 hover:bg-amber-200 animate-pulse'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }
              `}
              title="AI Settings"
            >
              <Settings size={18} />
            </button>

            {/* Send/Stop button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={stopStreaming}
                className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                title="Stop generating"
              >
                <Square size={18} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isDisabled || isLoading || !input.trim()}
                className={`
                  p-2 rounded-lg transition-colors
                  ${isDisabled || isLoading || !input.trim()
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }
                `}
                title="Send message"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Provider indicator */}
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-slate-400">
          {currentProviderConfigured ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span>Connected to {providerLabel}</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>Click settings to configure your AI provider</span>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default ChatInput;
