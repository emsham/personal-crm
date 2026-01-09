import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { EncryptedData } from './types';

const ENCRYPTION_VERSION = 1;
// Mobile uses faster iteration count for better UX
const PBKDF2_ITERATIONS_MOBILE = 10000;
// Web uses higher iteration count - we need to support decrypting these keys too
const PBKDF2_ITERATIONS_WEB = 100000;
const KEY_SIZE = 256 / 32; // 256 bits

// Legacy default for backward compatibility with existing encrypted keys
const LEGACY_DEFAULT_PASSPHRASE = 'nexus-default-key-material';

// In-memory cache for derived keys (avoids re-derivation during session)
const keyCache = new Map<string, string>();

// SecureStore key prefix for persisted derived keys
const DERIVED_KEY_PREFIX_MOBILE = 'nexus_derived_key_v4_mobile_';
const DERIVED_KEY_PREFIX_WEB = 'nexus_derived_key_v4_web_';

/**
 * Loads previously derived encryption keys from SecureStore.
 * Returns object with mobile and web iteration keys (either may be null).
 */
export async function loadCachedEncryptionKeys(userId: string): Promise<{
  mobileKey: string | null;
  webKey: string | null;
}> {
  try {
    const [mobileKey, webKey] = await Promise.all([
      SecureStore.getItemAsync(`${DERIVED_KEY_PREFIX_MOBILE}${userId}`),
      SecureStore.getItemAsync(`${DERIVED_KEY_PREFIX_WEB}${userId}`),
    ]);
    if (mobileKey) {
      keyCache.set(`${userId}:mobile`, mobileKey);
    }
    if (webKey) {
      keyCache.set(`${userId}:web`, webKey);
    }
    return { mobileKey, webKey };
  } catch {
    return { mobileKey: null, webKey: null };
  }
}

/**
 * Loads a previously derived encryption key from SecureStore.
 * @deprecated Use loadCachedEncryptionKeys instead for cross-platform support
 */
export async function loadCachedEncryptionKey(userId: string): Promise<string | null> {
  const { mobileKey } = await loadCachedEncryptionKeys(userId);
  return mobileKey;
}

/**
 * Clears all cached encryption keys from SecureStore.
 * Should be called on logout.
 */
export async function clearCachedEncryptionKey(userId: string): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(`${DERIVED_KEY_PREFIX_MOBILE}${userId}`),
      SecureStore.deleteItemAsync(`${DERIVED_KEY_PREFIX_WEB}${userId}`),
    ]);
    keyCache.delete(`${userId}:mobile`);
    keyCache.delete(`${userId}:web`);
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
 * @param useWebIterations - If true, uses 100k iterations (web compat). Default false (10k, faster)
 * @throws Error if passphrase is not provided
 */
export function deriveEncryptionKey(
  userId: string,
  passphrase?: string,
  useWebIterations: boolean = false
): string {
  if (!passphrase) {
    throw new Error('Passphrase is required for key derivation');
  }
  const iterations = useWebIterations ? PBKDF2_ITERATIONS_WEB : PBKDF2_ITERATIONS_MOBILE;
  const cacheKey = `${userId}:${useWebIterations ? 'web' : 'mobile'}`;

  // Return cached key if available
  const cachedKey = keyCache.get(cacheKey);
  if (cachedKey) {
    return cachedKey;
  }

  const salt = `${userId}-nexus-api-key-encryption-v1`;

  const derivedKey = CryptoJS.PBKDF2(passphrase, salt, {
    keySize: KEY_SIZE,
    iterations,
  }).toString();

  // Cache the derived key in memory
  keyCache.set(cacheKey, derivedKey);

  // Persist to SecureStore for fast subsequent app launches (async, non-blocking)
  const prefix = useWebIterations ? DERIVED_KEY_PREFIX_WEB : DERIVED_KEY_PREFIX_MOBILE;
  SecureStore.setItemAsync(`${prefix}${userId}`, derivedKey).catch(() => {
    // Ignore errors - caching is best-effort
  });

  return derivedKey;
}

/**
 * Derives both mobile (10k iterations) and web (100k iterations) encryption keys.
 * Used for decryption when we don't know which key was used to encrypt.
 * Mobile key is derived first (faster), web key is derived only if needed.
 */
export function deriveEncryptionKeys(
  userId: string,
  passphrase: string
): { mobileKey: string; webKey: string } {
  const mobileKey = deriveEncryptionKey(userId, passphrase, false);
  const webKey = deriveEncryptionKey(userId, passphrase, true);
  return { mobileKey, webKey };
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
 * Attempts to decrypt an API key trying multiple encryption keys.
 * Tries mobile iteration key first (faster), then web iteration key.
 * Returns decrypted key or empty string if all attempts fail.
 */
export function decryptApiKeyWithFallback(
  encryptedData: EncryptedData,
  userId: string,
  passphrase: string
): string {
  // Try mobile iterations first (10k - faster key derivation if not cached)
  const mobileKey = deriveEncryptionKey(userId, passphrase, false);
  try {
    const result = decryptApiKey(encryptedData, mobileKey);
    if (result && result.length > 0) {
      return result;
    }
  } catch {
    // Decryption failed with mobile key, try web key
  }

  // Try web iterations (100k - slower but may be needed for web-encrypted keys)
  const webKey = deriveEncryptionKey(userId, passphrase, true);
  try {
    const result = decryptApiKey(encryptedData, webKey);
    if (result && result.length > 0) {
      return result;
    }
  } catch {
    // Decryption failed with web key too
  }

  return '';
}

/**
 * Returns the last 4 characters of an API key for display purposes.
 */
export function getKeyHint(apiKey: string): string {
  if (apiKey.length <= 4) return '****';
  return `...${apiKey.slice(-4)}`;
}
