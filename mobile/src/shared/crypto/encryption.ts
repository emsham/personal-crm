import CryptoJS from 'crypto-js';
import { EncryptedData } from './types';

const ENCRYPTION_VERSION = 1;
const PBKDF2_ITERATIONS = 100000;
const KEY_SIZE = 256 / 32; // 256 bits

// Cache derived keys to avoid expensive PBKDF2 on every render
const keyCache = new Map<string, string>();

/**
 * Derives an encryption key from the user's Firebase UID using PBKDF2.
 * The key is deterministic - same UID always produces the same key.
 * Results are cached to avoid expensive PBKDF2 computation on every call.
 */
export function deriveEncryptionKey(userId: string, passphrase?: string): string {
  const password = passphrase || 'nexus-default-key-material';
  const cacheKey = `${userId}:${password}`;

  // Return cached key if available
  const cachedKey = keyCache.get(cacheKey);
  if (cachedKey) {
    return cachedKey;
  }

  const salt = `${userId}-nexus-api-key-encryption-v1`;

  const derivedKey = CryptoJS.PBKDF2(password, salt, {
    keySize: KEY_SIZE,
    iterations: PBKDF2_ITERATIONS,
  }).toString();

  // Cache the derived key
  keyCache.set(cacheKey, derivedKey);

  return derivedKey;
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
