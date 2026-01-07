import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { deriveEncryptionKey } from '../shared/crypto';
import { subscribeToApiKeys, saveApiKey, deleteApiKey, deleteAllApiKeys } from '../services/apiKeyService';
import { migrateSecureStoreApiKeys, clearLegacySecureStoreKeys } from '../services/apiKeyMigrationService';

export type LLMProvider = 'gemini' | 'openai';

export interface LLMSettings {
  provider: LLMProvider;
  geminiApiKey?: string;
  openaiApiKey?: string;
}

// AsyncStorage key for provider preference (not sensitive)
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
  const [settings, setSettings] = useState<LLMSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);

  // Derive encryption key asynchronously to avoid blocking UI
  // PBKDF2 with 100k iterations is slow on mobile devices
  useEffect(() => {
    if (!user?.uid) {
      setEncryptionKey(null);
      return;
    }

    // Run key derivation after navigation animations complete
    // This allows the home screen to render before the expensive computation
    const task = InteractionManager.runAfterInteractions(() => {
      const key = deriveEncryptionKey(user.uid);
      setEncryptionKey(key);
    });

    return () => task.cancel();
  }, [user?.uid]);

  // Load provider preference from AsyncStorage
  useEffect(() => {
    const loadProvider = async () => {
      try {
        const provider = await AsyncStorage.getItem(PROVIDER_KEY);
        if (provider) {
          setSettings(prev => ({ ...prev, provider: provider as LLMProvider }));
        }
      } catch (error) {
        console.error('Failed to load provider preference:', error);
      }
    };
    loadProvider();
  }, []);

  // Subscribe to encrypted API keys from Firestore when user is authenticated
  useEffect(() => {
    if (!user?.uid || !encryptionKey) {
      setIsLoading(false);
      // Clear keys when user logs out
      setSettings(prev => ({
        ...prev,
        geminiApiKey: undefined,
        openaiApiKey: undefined,
      }));
      return;
    }

    // Run migration first (one-time, from SecureStore to Firestore)
    migrateSecureStoreApiKeys(user.uid, encryptionKey).catch(console.error);

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

  const setProvider = useCallback(async (provider: LLMProvider) => {
    setSettings(prev => ({ ...prev, provider }));
    try {
      await AsyncStorage.setItem(PROVIDER_KEY, provider);
    } catch (error) {
      console.error('Failed to save provider preference:', error);
    }
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
      // Also clear any legacy SecureStore keys to prevent re-migration
      await clearLegacySecureStoreKeys();
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
