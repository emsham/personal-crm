import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type LLMProvider = 'gemini' | 'openai';

export interface LLMSettings {
  provider: LLMProvider;
  geminiApiKey?: string;
  openaiApiKey?: string;
}

// AsyncStorage keys
const STORAGE_PREFIX = 'nexus_llm_';
const PROVIDER_KEY = `${STORAGE_PREFIX}provider`;
const GEMINI_KEY = `${STORAGE_PREFIX}gemini_key`;
const OPENAI_KEY = `${STORAGE_PREFIX}openai_key`;

interface LLMSettingsContextType {
  settings: LLMSettings;
  isConfigured: boolean;
  currentProviderConfigured: boolean;
  isLoading: boolean;
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
  const [settings, setSettings] = useState<LLMSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [provider, geminiApiKey, openaiApiKey] = await Promise.all([
          AsyncStorage.getItem(PROVIDER_KEY),
          AsyncStorage.getItem(GEMINI_KEY),
          AsyncStorage.getItem(OPENAI_KEY),
        ]);

        setSettings({
          provider: (provider as LLMProvider) || 'gemini',
          geminiApiKey: geminiApiKey || undefined,
          openaiApiKey: openaiApiKey || undefined,
        });
      } catch (error) {
        console.error('Failed to load LLM settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Check if any provider is configured
  const isConfigured = Boolean(settings.geminiApiKey || settings.openaiApiKey);

  // Check if the current provider is configured
  const currentProviderConfigured =
    (settings.provider === 'gemini' && Boolean(settings.geminiApiKey)) ||
    (settings.provider === 'openai' && Boolean(settings.openaiApiKey));

  const setProvider = useCallback(async (provider: LLMProvider) => {
    setSettings(prev => ({ ...prev, provider }));
    try {
      await AsyncStorage.setItem(PROVIDER_KEY, provider);
    } catch (error) {
      console.error('Failed to save provider:', error);
    }
  }, []);

  const setGeminiApiKey = useCallback(async (key: string) => {
    const trimmedKey = key.trim();
    setSettings(prev => ({ ...prev, geminiApiKey: trimmedKey || undefined }));
    try {
      if (trimmedKey) {
        await AsyncStorage.setItem(GEMINI_KEY, trimmedKey);
      } else {
        await AsyncStorage.removeItem(GEMINI_KEY);
      }
    } catch (error) {
      console.error('Failed to save Gemini API key:', error);
    }
  }, []);

  const setOpenAIApiKey = useCallback(async (key: string) => {
    const trimmedKey = key.trim();
    setSettings(prev => ({ ...prev, openaiApiKey: trimmedKey || undefined }));
    try {
      if (trimmedKey) {
        await AsyncStorage.setItem(OPENAI_KEY, trimmedKey);
      } else {
        await AsyncStorage.removeItem(OPENAI_KEY);
      }
    } catch (error) {
      console.error('Failed to save OpenAI API key:', error);
    }
  }, []);

  const clearApiKeys = useCallback(async () => {
    setSettings(prev => ({ ...prev, geminiApiKey: undefined, openaiApiKey: undefined }));
    try {
      await Promise.all([
        AsyncStorage.removeItem(GEMINI_KEY),
        AsyncStorage.removeItem(OPENAI_KEY),
      ]);
    } catch (error) {
      console.error('Failed to clear API keys:', error);
    }
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
    isLoading,
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
