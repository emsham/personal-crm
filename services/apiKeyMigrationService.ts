import { saveApiKey } from './apiKeyService';
import { ApiKeyEntry } from '../shared/crypto';

// Old localStorage keys (legacy)
const OLD_GEMINI_KEY = 'nexus_llm_gemini_key';
const OLD_OPENAI_KEY = 'nexus_llm_openai_key';
const MIGRATION_FLAG = 'nexus_api_keys_migrated_v1';

/**
 * Clears any legacy localStorage API keys.
 * Call this when user explicitly clears their keys to ensure clean state.
 */
export function clearLegacyLocalStorageKeys(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OLD_GEMINI_KEY);
  localStorage.removeItem(OLD_OPENAI_KEY);
}

/**
 * Migrates API keys from localStorage to encrypted Firestore storage.
 * This is a one-time migration that runs on first load after the update.
 */
export async function migrateLocalStorageApiKeys(
  userId: string,
  encryptionKey: string
): Promise<void> {
  // Skip if not in browser environment
  if (typeof window === 'undefined') return;

  // Check if already migrated
  if (localStorage.getItem(MIGRATION_FLAG) === 'true') {
    return;
  }

  const keysToMigrate: ApiKeyEntry[] = [];

  // Read existing keys from localStorage
  const geminiKey = localStorage.getItem(OLD_GEMINI_KEY);
  if (geminiKey) {
    keysToMigrate.push({ providerId: 'gemini', apiKey: geminiKey });
  }

  const openaiKey = localStorage.getItem(OLD_OPENAI_KEY);
  if (openaiKey) {
    keysToMigrate.push({ providerId: 'openai', apiKey: openaiKey });
  }

  // If no keys to migrate, just mark as done
  if (keysToMigrate.length === 0) {
    localStorage.setItem(MIGRATION_FLAG, 'true');
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

  // Clear old localStorage keys after successful migration
  localStorage.removeItem(OLD_GEMINI_KEY);
  localStorage.removeItem(OLD_OPENAI_KEY);

  // Mark migration as complete
  localStorage.setItem(MIGRATION_FLAG, 'true');

  console.log(`Successfully migrated ${keysToMigrate.length} API key(s) to Firestore`);
}
