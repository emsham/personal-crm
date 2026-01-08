import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { deriveEncryptionKey } from '../shared/crypto';
import { subscribeToApiKeys, saveApiKey, deleteApiKey, deleteAllApiKeys, loadCachedApiKeys, cacheApiKeysLocally, clearCachedApiKeys } from '../services/apiKeyService';
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
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<LLMSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);

  // Derive encryption key when user logs in
  useEffect(() => {
    if (!user?.uid) {
      setEncryptionKey(null);
      return;
    }

    // Derive key immediately - we're showing a loading screen anyway
    const key = deriveEncryptionKey(user.uid, user.uid);
    setEncryptionKey(key);
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

  // Load cached API keys first for instant startup (before Firestore)
  useEffect(() => {
    if (authLoading || !user?.uid) return;

    // Try to load from local cache immediately
    loadCachedApiKeys().then(cached => {
      if (cached && (cached.gemini || cached.openai)) {
        setSettings(prev => ({
          ...prev,
          geminiApiKey: cached.gemini,
          openaiApiKey: cached.openai,
        }));
        setIsLoading(false); // Show UI immediately with cached keys
      }
    });
  }, [authLoading, user?.uid]);

  // Subscribe to encrypted API keys from Firestore when user is authenticated
  useEffect(() => {
    // Don't do anything while auth is still loading
    if (authLoading) {
      return;
    }

    // If user is not logged in, we're done loading (no keys to fetch)
    if (!user?.uid) {
      setIsLoading(false);
      setSettings(prev => ({
        ...prev,
        geminiApiKey: undefined,
        openaiApiKey: undefined,
      }));
      // Clear local cache on logout
      clearCachedApiKeys();
      return;
    }

    // If encryption key is not ready yet, wait for it
    // But set a short timeout to prevent indefinite loading
    if (!encryptionKey) {
      const timeout = setTimeout(() => {
        // If still loading after 2 seconds without encryption key,
        // show the app anyway (user can configure AI later)
        setIsLoading(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }

    // Run migration first (one-time, from SecureStore to Firestore)
    migrateSecureStoreApiKeys(user.uid, encryptionKey).catch(console.error);

    // Set up a timeout for Firestore in case it's slow/offline
    let didReceiveData = false;
    const timeout = setTimeout(() => {
      if (!didReceiveData) {
        // Firestore is slow - show app anyway with whatever we have
        setIsLoading(false);
      }
    }, 3000);

    // Subscribe to real-time updates from Firestore
    const unsubscribe = subscribeToApiKeys(user.uid, encryptionKey, (keys) => {
      didReceiveData = true;
      setSettings(prev => ({
        ...prev,
        geminiApiKey: keys.gemini,
        openaiApiKey: keys.openai,
      }));
      setIsLoading(false);

      // Cache keys locally for instant startup next time
      cacheApiKeysLocally(keys);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [authLoading, user?.uid, encryptionKey]);

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
      // Clear the local cache as well
      await clearCachedApiKeys();
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
