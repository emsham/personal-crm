import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, Check, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useLLMSettings } from '../contexts/LLMSettingsContext';
import { LLMProvider } from '../types';

const SettingsPage: React.FC = () => {
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

  useEffect(() => {
    setGeminiKey(settings.geminiApiKey || '');
    setOpenaiKey(settings.openaiApiKey || '');
  }, [settings]);

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="pl-14 lg:pl-0">
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-slate-400 text-sm mt-1">Manage your app preferences</p>
      </div>

      {/* AI Settings Section */}
      <div className="glass rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI Settings</h3>
            <p className="text-xs text-slate-400">Bring your own API keys</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Provider selection */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 block">
              Active Provider
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {providers.map((provider) => {
                const isActive = settings.provider === provider.id;
                const hasKey = provider.id === 'gemini' ? !!geminiKey : !!openaiKey;

                return (
                  <button
                    key={provider.id}
                    onClick={() => setProvider(provider.id)}
                    className={`
                      relative p-4 rounded-xl text-left transition-all
                      ${isActive
                        ? 'bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border-2 border-violet-500/50 shadow-lg shadow-violet-500/10'
                        : 'glass-light border-2 border-transparent hover:border-white/10'
                      }
                    `}
                  >
                    {isActive && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                    <div className="font-semibold text-white">{provider.name}</div>
                    <div className="text-xs text-slate-400 mt-1">{provider.description}</div>
                    {hasKey ? (
                      <div className="flex items-center gap-1 mt-2 text-xs text-emerald-400">
                        <Check size={12} />
                        Key configured
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-2 text-xs text-amber-400">
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              API Keys
            </label>

            {/* Gemini Key */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300">Google Gemini</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
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
                  className="w-full px-4 py-3 pr-12 input-dark rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors"
                >
                  {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* OpenAI Key */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300">OpenAI</span>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
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
                  className="w-full px-4 py-3 pr-12 input-dark rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors"
                >
                  {showOpenaiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Security notice */}
          <div className="p-4 rounded-xl glass-light border border-white/5">
            <div className="flex items-start gap-3">
              <Key size={16} className="text-violet-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-slate-400">
                <strong className="text-slate-300">Your keys are encrypted and synced.</strong> Keys are encrypted on your device and synced across all your devices. API calls go directly to the provider.
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <button
              onClick={handleClearAll}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Clear all keys
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2"
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
  );
};

export default SettingsPage;
