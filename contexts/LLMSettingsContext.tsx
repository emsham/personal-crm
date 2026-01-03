import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LLMProvider, LLMSettings } from '../types';

// LocalStorage keys
const STORAGE_PREFIX = 'nexus_llm_';
const PROVIDER_KEY = `${STORAGE_PREFIX}provider`;
const GEMINI_KEY = `${STORAGE_PREFIX}gemini_key`;
const OPENAI_KEY = `${STORAGE_PREFIX}openai_key`;

interface LLMSettingsContextType {
  settings: LLMSettings;
  isConfigured: boolean;
  currentProviderConfigured: boolean;
  setProvider: (provider: LLMProvider) => void;
  setGeminiApiKey: (key: string) => void;
  setOpenAIApiKey: (key: string) => void;
  clearApiKeys: () => void;
  getActiveApiKey: () => string | undefined;
}

const defaultSettings: LLMSettings = {
  provider: 'gemini',
  geminiApiKey: undefined,
  openaiApiKey: undefined,
};

const LLMSettingsContext = createContext<LLMSettingsContextType | undefined>(undefined);

export const LLMSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<LLMSettings>(() => {
    // Load from localStorage on mount
    if (typeof window === 'undefined') return defaultSettings;

    const provider = (localStorage.getItem(PROVIDER_KEY) as LLMProvider) || 'gemini';
    const geminiApiKey = localStorage.getItem(GEMINI_KEY) || undefined;
    const openaiApiKey = localStorage.getItem(OPENAI_KEY) || undefined;

    return { provider, geminiApiKey, openaiApiKey };
  });

  // Check if any provider is configured
  const isConfigured = Boolean(settings.geminiApiKey || settings.openaiApiKey);

  // Check if the current provider is configured
  const currentProviderConfigured =
    (settings.provider === 'gemini' && Boolean(settings.geminiApiKey)) ||
    (settings.provider === 'openai' && Boolean(settings.openaiApiKey));

  const setProvider = useCallback((provider: LLMProvider) => {
    setSettings(prev => ({ ...prev, provider }));
    localStorage.setItem(PROVIDER_KEY, provider);
  }, []);

  const setGeminiApiKey = useCallback((key: string) => {
    const trimmedKey = key.trim();
    setSettings(prev => ({ ...prev, geminiApiKey: trimmedKey || undefined }));
    if (trimmedKey) {
      localStorage.setItem(GEMINI_KEY, trimmedKey);
    } else {
      localStorage.removeItem(GEMINI_KEY);
    }
  }, []);

  const setOpenAIApiKey = useCallback((key: string) => {
    const trimmedKey = key.trim();
    setSettings(prev => ({ ...prev, openaiApiKey: trimmedKey || undefined }));
    if (trimmedKey) {
      localStorage.setItem(OPENAI_KEY, trimmedKey);
    } else {
      localStorage.removeItem(OPENAI_KEY);
    }
  }, []);

  const clearApiKeys = useCallback(() => {
    setSettings(prev => ({ ...prev, geminiApiKey: undefined, openaiApiKey: undefined }));
    localStorage.removeItem(GEMINI_KEY);
    localStorage.removeItem(OPENAI_KEY);
  }, []);

  const getActiveApiKey = useCallback(() => {
    if (settings.provider === 'gemini') {
      return settings.geminiApiKey;
    }
    return settings.openaiApiKey;
  }, [settings.provider, settings.geminiApiKey, settings.openaiApiKey]);

  const value: LLMSettingsContextType = {
    settings,
    isConfigured,
    currentProviderConfigured,
    setProvider,
    setGeminiApiKey,
    setOpenAIApiKey,
    clearApiKeys,
    getActiveApiKey,
  };

  return (
    <LLMSettingsContext.Provider value={value}>
      {children}
    </LLMSettingsContext.Provider>
  );
};

export const useLLMSettings = (): LLMSettingsContextType => {
  const context = useContext(LLMSettingsContext);
  if (context === undefined) {
    throw new Error('useLLMSettings must be used within an LLMSettingsProvider');
  }
  return context;
};
