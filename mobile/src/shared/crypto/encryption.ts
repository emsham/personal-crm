import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { EncryptedData } from './types';

const ENCRYPTION_VERSION = 1;
const PBKDF2_ITERATIONS = 100000;
const KEY_SIZE = 256 / 32; // 256 bits

// Legacy default for backward compatibility with existing encrypted keys
const LEGACY_DEFAULT_PASSPHRASE = 'nexus-default-key-material';

// In-memory cache for derived keys (avoids re-derivation during session)
const keyCache = new Map<string, string>();

// SecureStore key prefix for persisted derived keys
const DERIVED_KEY_PREFIX = 'nexus_derived_key_';

/**
 * Loads a previously derived encryption key from SecureStore.
 * Returns null if not found.
 */
export async function loadCachedEncryptionKey(userId: string): Promise<string | null> {
  try {
    const key = await SecureStore.getItemAsync(`${DERIVED_KEY_PREFIX}${userId}`);
    if (key) {
      // Also populate in-memory cache
      keyCache.set(`${userId}:${userId}`, key);
    }
    return key;
  } catch {
    return null;
  }
}

/**
 * Clears the cached encryption key from SecureStore.
 * Should be called on logout.
 */
export async function clearCachedEncryptionKey(userId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(`${DERIVED_KEY_PREFIX}${userId}`);
    keyCache.delete(`${userId}:${userId}`);
  } catch {
    // Ignore errors
  }
}

/**
 * Derives an encryption key from the user's Firebase UID using PBKDF2.
 * The key is deterministic - same UID always produces the same key.
 * Results are cached in memory and persisted to SecureStore.
 *
 * @param userId - The user's Firebase UID (used as salt component)
 * @param passphrase - Required passphrase for key derivation (typically the userId itself)
 * @throws Error if passphrase is not provided
 */
export function deriveEncryptionKey(userId: string, passphrase?: string): string {
  if (!passphrase) {
    throw new Error('Passphrase is required for key derivation');
  }
  const cacheKey = `${userId}:${passphrase}`;

  // Return cached key if available
  const cachedKey = keyCache.get(cacheKey);
  if (cachedKey) {
    return cachedKey;
  }

  const salt = `${userId}-nexus-api-key-encryption-v1`;

  const derivedKey = CryptoJS.PBKDF2(passphrase, salt, {
    keySize: KEY_SIZE,
    iterations: PBKDF2_ITERATIONS,
  }).toString();

  // Cache the derived key in memory
  keyCache.set(cacheKey, derivedKey);

  // Persist to SecureStore for fast subsequent app launches (async, non-blocking)
  SecureStore.setItemAsync(`${DERIVED_KEY_PREFIX}${userId}`, derivedKey).catch(() => {
    // Ignore errors - caching is best-effort
  });

  return derivedKey;
}

/**
 * Derives a legacy encryption key for backward compatibility.
 * Used only for decrypting keys that were encrypted before the security update.
 */
export function deriveLegacyEncryptionKey(userId: string): string {
  return deriveEncryptionKey(userId, LEGACY_DEFAULT_PASSPHRASE);
}

/**
 * Encrypts an API key using AES-256-CBC with a random IV.
 */
export function encryptApiKey(apiKey: string, encryptionKey: string): EncryptedData {
  const iv = CryptoJS.lib.WordArray.random(16);
  const key = CryptoJS.enc.Hex.parse(encryptionKey);

  const encrypted = CryptoJS.AES.encrypt(apiKey, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
    iv: iv.toString(CryptoJS.enc.Hex),
    version: ENCRYPTION_VERSION,
  };
}

/**
 * Decrypts an encrypted API key using AES-256-CBC.
 */
export function decryptApiKey(encryptedData: EncryptedData, encryptionKey: string): string {
  const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
  const key = CryptoJS.enc.Hex.parse(encryptionKey);
  const ciphertext = CryptoJS.enc.Base64.parse(encryptedData.ciphertext);

  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: ciphertext,
  });

  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * Returns the last 4 characters of an API key for display purposes.
 */
export function getKeyHint(apiKey: string): string {
  if (apiKey.length <= 4) return '****';
  return `...${apiKey.slice(-4)}`;
}
