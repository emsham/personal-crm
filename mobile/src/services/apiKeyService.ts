import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import * as SecureStore from 'expo-secure-store';
import { db } from '../config/firebase';
import {
  encryptApiKey,
  decryptApiKey,
  getKeyHint,
  EncryptedData,
  DecryptedApiKeys,
} from '../shared/crypto';

// Local cache keys for fast app startup
const LOCAL_CACHE_KEY_GEMINI = 'nexus_cached_gemini_key';
const LOCAL_CACHE_KEY_OPENAI = 'nexus_cached_openai_key';

/**
 * Subscribes to real-time updates of encrypted API keys from Firestore.
 * Automatically decrypts keys using the provided encryption key.
 */
export function subscribeToApiKeys(
  userId: string,
  encryptionKey: string,
  callback: (keys: DecryptedApiKeys) => void
): () => void {
  const keysRef = collection(db, 'users', userId, 'apiKeys');

  return onSnapshot(keysRef, (snapshot) => {
    const decryptedKeys: DecryptedApiKeys = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      try {
        const encryptedData: EncryptedData = {
          ciphertext: data.encryptedKey,
          iv: data.iv,
          version: data.encryptionVersion,
        };
        decryptedKeys[doc.id] = decryptApiKey(encryptedData, encryptionKey);
      } catch (error) {
        console.error(`Failed to decrypt key for ${doc.id}:`, error);
      }
    });

    callback(decryptedKeys);
  });
}

/**
 * Saves an encrypted API key to Firestore.
 */
export async function saveApiKey(
  userId: string,
  providerId: string,
  apiKey: string,
  encryptionKey: string
): Promise<void> {
  const keyRef = doc(db, 'users', userId, 'apiKeys', providerId);
  const encrypted = encryptApiKey(apiKey, encryptionKey);

  await setDoc(keyRef, {
    providerId,
    encryptedKey: encrypted.ciphertext,
    iv: encrypted.iv,
    encryptionVersion: encrypted.version,
    keyHint: getKeyHint(apiKey),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes an API key from Firestore.
 */
export async function deleteApiKey(
  userId: string,
  providerId: string
): Promise<void> {
  const keyRef = doc(db, 'users', userId, 'apiKeys', providerId);
  await deleteDoc(keyRef);
}

/**
 * Deletes all API keys for a user from Firestore.
 */
export async function deleteAllApiKeys(userId: string): Promise<void> {
  const providers = ['gemini', 'openai'];
  await Promise.all(
    providers.map((providerId) => deleteApiKey(userId, providerId))
  );
}

/**
 * Caches decrypted API keys locally in SecureStore for fast app startup.
 * Called after successfully fetching keys from Firestore.
 */
export async function cacheApiKeysLocally(keys: DecryptedApiKeys): Promise<void> {
  try {
    if (keys.gemini) {
      await SecureStore.setItemAsync(LOCAL_CACHE_KEY_GEMINI, keys.gemini);
    } else {
      await SecureStore.deleteItemAsync(LOCAL_CACHE_KEY_GEMINI);
    }

    if (keys.openai) {
      await SecureStore.setItemAsync(LOCAL_CACHE_KEY_OPENAI, keys.openai);
    } else {
      await SecureStore.deleteItemAsync(LOCAL_CACHE_KEY_OPENAI);
    }
  } catch (error) {
    console.error('Failed to cache API keys locally:', error);
  }
}

/**
 * Loads cached API keys from SecureStore for instant app startup.
 * Returns null if no cached keys exist.
 */
export async function loadCachedApiKeys(): Promise<DecryptedApiKeys | null> {
  try {
    const [gemini, openai] = await Promise.all([
      SecureStore.getItemAsync(LOCAL_CACHE_KEY_GEMINI),
      SecureStore.getItemAsync(LOCAL_CACHE_KEY_OPENAI),
    ]);

    if (!gemini && !openai) {
      return null;
    }

    const keys: DecryptedApiKeys = {};
    if (gemini) keys.gemini = gemini;
    if (openai) keys.openai = openai;
    return keys;
  } catch (error) {
    console.error('Failed to load cached API keys:', error);
    return null;
  }
}

/**
 * Clears cached API keys from SecureStore.
 * Should be called on logout.
 */
export async function clearCachedApiKeys(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(LOCAL_CACHE_KEY_GEMINI),
      SecureStore.deleteItemAsync(LOCAL_CACHE_KEY_OPENAI),
    ]);
  } catch (error) {
    console.error('Failed to clear cached API keys:', error);
  }
}
