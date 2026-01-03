import React, { useState, useEffect } from 'react';
import { X, Key, ExternalLink, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useLLMSettings } from '../../contexts/LLMSettingsContext';
import { LLMProvider } from '../../types';

interface LLMSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LLMSettingsModal: React.FC<LLMSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    setProvider,
    setGeminiApiKey,
    setOpenAIApiKey,
    clearApiKeys,
  } = useLLMSettings();

  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey || '');
  const [openaiKey, setOpenaiKey] = useState(settings.openaiApiKey || '');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [saved, setSaved] = useState(false);

  // Update local state when settings change
  useEffect(() => {
    setGeminiKey(settings.geminiApiKey || '');
    setOpenaiKey(settings.openaiApiKey || '');
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    setGeminiApiKey(geminiKey);
    setOpenAIApiKey(openaiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all API keys? This will disable AI features until you add new keys.')) {
      clearApiKeys();
      setGeminiKey('');
      setOpenaiKey('');
    }
  };

  const providers: { id: LLMProvider; name: string; description: string; keyPlaceholder: string; docUrl: string }[] = [
    {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'Fast and capable. Great for general CRM tasks.',
      keyPlaceholder: 'AIzaSy...',
      docUrl: 'https://aistudio.google.com/app/apikey',
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT-4o-mini. Reliable and well-tested.',
      keyPlaceholder: 'sk-proj-...',
      docUrl: 'https://platform.openai.com/api-keys',
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Key size={20} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">AI Settings</h2>
                <p className="text-xs text-slate-500">Bring your own API keys</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Provider selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Active Provider
              </label>
              <div className="grid grid-cols-2 gap-3">
                {providers.map((provider) => {
                  const isActive = settings.provider === provider.id;
                  const hasKey = provider.id === 'gemini' ? !!geminiKey : !!openaiKey;

                  return (
                    <button
                      key={provider.id}
                      onClick={() => setProvider(provider.id)}
                      className={`
                        relative p-4 rounded-xl border-2 text-left transition-all
                        ${isActive
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                        }
                      `}
                    >
                      {isActive && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                      <div className="font-medium text-slate-900">{provider.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{provider.description}</div>
                      {hasKey ? (
                        <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                          <Check size={12} />
                          Key configured
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                          <AlertCircle size={12} />
                          No key set
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* API Keys */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                API Keys
              </label>

              {/* Gemini Key */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-600">Google Gemini</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    Get API Key <ExternalLink size={10} />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* OpenAI Key */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-600">OpenAI</span>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    Get API Key <ExternalLink size={10} />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showOpenaiKey ? 'text' : 'password'}
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-proj-..."
                    className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    {showOpenaiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Security notice */}
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-start gap-2">
                <Key size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-slate-500">
                  <strong className="text-slate-600">Your keys are stored locally.</strong> They are saved in your browser's localStorage and never sent to our servers. API calls go directly to the provider.
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <button
              onClick={handleClearAll}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Clear all keys
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                {saved ? (
                  <>
                    <Check size={16} />
                    Saved!
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LLMSettingsModal;
