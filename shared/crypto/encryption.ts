import CryptoJS from 'crypto-js';
import { EncryptedData } from './types';

const ENCRYPTION_VERSION = 1;
// Web uses 100k iterations for encryption (more secure)
const PBKDF2_ITERATIONS_WEB = 100000;
// Mobile uses 10k iterations (faster UX) - we need to support decrypting these
const PBKDF2_ITERATIONS_MOBILE = 10000;
const KEY_SIZE = 256 / 32; // 256 bits

// Legacy default for backward compatibility with existing encrypted keys
const LEGACY_DEFAULT_PASSPHRASE = 'nexus-default-key-material';

/**
 * Derives an encryption key from the user's Firebase UID using PBKDF2.
 * The key is deterministic - same UID always produces the same key.
 *
 * @param userId - The user's Firebase UID (used as salt component)
 * @param passphrase - Required passphrase for key derivation (typically the userId itself)
 * @param useMobileIterations - If true, uses 10k iterations (mobile compat). Default false (100k, web default)
 * @throws Error if passphrase is not provided
 */
export function deriveEncryptionKey(
  userId: string,
  passphrase?: string,
  useMobileIterations: boolean = false
): string {
  if (!passphrase) {
    throw new Error('Passphrase is required for key derivation');
  }
  const salt = `${userId}-nexus-api-key-encryption-v1`;
  const iterations = useMobileIterations ? PBKDF2_ITERATIONS_MOBILE : PBKDF2_ITERATIONS_WEB;

  return CryptoJS.PBKDF2(passphrase, salt, {
    keySize: KEY_SIZE,
    iterations,
  }).toString();
}

/**
 * Derives both web (100k iterations) and mobile (10k iterations) encryption keys.
 * Used for decryption when we don't know which key was used to encrypt.
 */
export function deriveEncryptionKeys(
  userId: string,
  passphrase: string
): { webKey: string; mobileKey: string } {
  const webKey = deriveEncryptionKey(userId, passphrase, false);
  const mobileKey = deriveEncryptionKey(userId, passphrase, true);
  return { webKey, mobileKey };
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
 * Tries web iteration key first (100k), then mobile iteration key (10k).
 * Returns decrypted key or empty string if all attempts fail.
 */
export function decryptApiKeyWithFallback(
  encryptedData: EncryptedData,
  userId: string,
  passphrase: string
): string {
  // Try web iterations first (100k - most likely for web-saved keys)
  const webKey = deriveEncryptionKey(userId, passphrase, false);
  try {
    const result = decryptApiKey(encryptedData, webKey);
    if (result && result.length > 0) {
      return result;
    }
  } catch {
    // Decryption failed with web key, try mobile key
  }

  // Try mobile iterations (10k - for keys saved from mobile app)
  const mobileKey = deriveEncryptionKey(userId, passphrase, true);
  try {
    const result = decryptApiKey(encryptedData, mobileKey);
    if (result && result.length > 0) {
      return result;
    }
  } catch {
    // Decryption failed with mobile key too
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
