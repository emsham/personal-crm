import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { LLMProvider, LLMSettings } from '../types';
import { useAuth } from './AuthContext';
import { deriveEncryptionKey } from '../shared/crypto';
import { subscribeToApiKeys, saveApiKey, deleteApiKey, deleteAllApiKeys } from '../services/apiKeyService';
import { migrateLocalStorageApiKeys, clearLegacyLocalStorageKeys } from '../services/apiKeyMigrationService';

// localStorage key for provider preference (not sensitive)
const PROVIDER_KEY = 'nexus_llm_provider';

interface LLMSettingsContextType {
  settings: LLMSettings;
  isConfigured: boolean;
  currentProviderConfigured: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  setProvider: (provider: LLMProvider) => void;
  setGeminiApiKey: (key: string) => Promise<void>;
  setOpenAIApiKey: (key: string) => Promise<void>;
  clearApiKeys: () => Promise<void>;
  getActiveApiKey: () => string | undefined;
}

const defaultSettings: LLMSettings = {
  provider: 'gemini',
  geminiApiKey: undefined,
  openaiApiKey: undefined,
};

const LLMSettingsContext = createContext<LLMSettingsContextType | undefined>(undefined);

export const LLMSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<LLMSettings>(() => {
    // Load provider preference from localStorage on mount
    if (typeof window === 'undefined') return defaultSettings;
    const provider = (localStorage.getItem(PROVIDER_KEY) as LLMProvider) || 'gemini';
    return { ...defaultSettings, provider };
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Derive encryption key from user ID (deterministic)
  const encryptionKey = useMemo(() => {
    if (!user?.uid) return null;
    return deriveEncryptionKey(user.uid);
  }, [user?.uid]);

  // Subscribe to encrypted API keys from Firestore when user is authenticated
  useEffect(() => {
    // If user is not logged in, we're done loading (no keys to fetch)
    if (!user?.uid) {
      setIsLoading(false);
      setSettings(prev => ({
        ...prev,
        geminiApiKey: undefined,
        openaiApiKey: undefined,
      }));
      return;
    }

    // If encryption key isn't ready yet, keep loading state as true
    if (!encryptionKey) {
      setIsLoading(true);
      return;
    }

    // User is logged in and encryption key is ready - fetch their API keys
    // Set loading to true while we wait for Firestore
    setIsLoading(true);

    // Run migration first (one-time, from localStorage to Firestore)
    migrateLocalStorageApiKeys(user.uid, encryptionKey).catch(console.error);

    // Subscribe to real-time updates from Firestore
    const unsubscribe = subscribeToApiKeys(user.uid, encryptionKey, (keys) => {
      setSettings(prev => ({
        ...prev,
        geminiApiKey: keys.gemini,
        openaiApiKey: keys.openai,
      }));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, encryptionKey]);

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

  const setGeminiApiKey = useCallback(async (key: string) => {
    if (!user?.uid || !encryptionKey) return;

    const trimmedKey = key.trim();
    setIsSyncing(true);

    try {
      if (trimmedKey) {
        await saveApiKey(user.uid, 'gemini', trimmedKey, encryptionKey);
      } else {
        await deleteApiKey(user.uid, 'gemini');
      }
    } catch (error) {
      console.error('Failed to save Gemini API key:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [user?.uid, encryptionKey]);

  const setOpenAIApiKey = useCallback(async (key: string) => {
    if (!user?.uid || !encryptionKey) return;

    const trimmedKey = key.trim();
    setIsSyncing(true);

    try {
      if (trimmedKey) {
        await saveApiKey(user.uid, 'openai', trimmedKey, encryptionKey);
      } else {
        await deleteApiKey(user.uid, 'openai');
      }
    } catch (error) {
      console.error('Failed to save OpenAI API key:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [user?.uid, encryptionKey]);

  const clearApiKeys = useCallback(async () => {
    if (!user?.uid) return;

    setIsSyncing(true);
    try {
      await deleteAllApiKeys(user.uid);
      // Also clear any legacy localStorage keys to prevent re-migration
      clearLegacyLocalStorageKeys();
    } catch (error) {
      console.error('Failed to clear API keys:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [user?.uid]);

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
    isSyncing,
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
