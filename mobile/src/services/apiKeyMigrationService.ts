import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { saveApiKey } from './apiKeyService';
import { ApiKeyEntry } from '../shared/crypto';

// Old storage keys (legacy)
const OLD_GEMINI_KEY = 'nexus_gemini_api_key';
const OLD_OPENAI_KEY = 'nexus_openai_api_key';
const MIGRATION_FLAG = 'nexus_api_keys_migrated_v1';

/**
 * Clears any legacy SecureStore API keys.
 * Call this when user explicitly clears their keys to ensure clean state.
 */
export async function clearLegacySecureStoreKeys(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(OLD_GEMINI_KEY);
    await SecureStore.deleteItemAsync(OLD_OPENAI_KEY);
  } catch (error) {
    console.error('Failed to clear legacy SecureStore keys:', error);
  }
}

/**
 * Migrates API keys from SecureStore to encrypted Firestore storage.
 * This is a one-time migration that runs on first load after the update.
 */
export async function migrateSecureStoreApiKeys(
  userId: string,
  encryptionKey: string
): Promise<void> {
  // Check if already migrated
  const migrated = await AsyncStorage.getItem(MIGRATION_FLAG);
  if (migrated === 'true') {
    return;
  }

  const keysToMigrate: ApiKeyEntry[] = [];

  // Read existing keys from SecureStore
  try {
    const geminiKey = await SecureStore.getItemAsync(OLD_GEMINI_KEY);
    if (geminiKey) {
      keysToMigrate.push({ providerId: 'gemini', apiKey: geminiKey });
    }

    const openaiKey = await SecureStore.getItemAsync(OLD_OPENAI_KEY);
    if (openaiKey) {
      keysToMigrate.push({ providerId: 'openai', apiKey: openaiKey });
    }
  } catch (error) {
    console.error('Failed to read keys from SecureStore:', error);
    return;
  }

  // If no keys to migrate, just mark as done
  if (keysToMigrate.length === 0) {
    await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
    return;
  }

  // Encrypt and upload each key to Firestore
  for (const entry of keysToMigrate) {
    try {
      await saveApiKey(userId, entry.providerId, entry.apiKey, encryptionKey);
    } catch (error) {
      console.error(`Failed to migrate ${entry.providerId} API key:`, error);
      // Don't mark as migrated if there's an error - will retry next time
      return;
    }
  }

  // Clear old SecureStore keys after successful migration
  try {
    await SecureStore.deleteItemAsync(OLD_GEMINI_KEY);
    await SecureStore.deleteItemAsync(OLD_OPENAI_KEY);
  } catch (error) {
    console.error('Failed to clear old SecureStore keys:', error);
  }

  // Mark migration as complete
  await AsyncStorage.setItem(MIGRATION_FLAG, 'true');

  console.log(`Successfully migrated ${keysToMigrate.length} API key(s) to Firestore`);
}
