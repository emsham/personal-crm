import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  encryptApiKey,
  decryptApiKey,
  getKeyHint,
  deriveLegacyEncryptionKey,
  EncryptedData,
  DecryptedApiKeys,
} from '../shared/crypto';

/**
 * Subscribes to real-time updates of encrypted API keys from Firestore.
 * Automatically decrypts keys using the provided encryption key.
 * Falls back to legacy encryption key for backward compatibility.
 */
export function subscribeToApiKeys(
  userId: string,
  encryptionKey: string,
  callback: (keys: DecryptedApiKeys) => void
): () => void {
  const keysRef = collection(db, 'users', userId, 'apiKeys');
  // Derive legacy key for backward compatibility with old encrypted keys
  const legacyKey = deriveLegacyEncryptionKey(userId);

  return onSnapshot(keysRef, (snapshot) => {
    const decryptedKeys: DecryptedApiKeys = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const encryptedData: EncryptedData = {
        ciphertext: data.encryptedKey,
        iv: data.iv,
        version: data.encryptionVersion,
      };

      // Try new encryption key first
      try {
        decryptedKeys[doc.id] = decryptApiKey(encryptedData, encryptionKey);
      } catch {
        // Fall back to legacy key for backward compatibility
        try {
          decryptedKeys[doc.id] = decryptApiKey(encryptedData, legacyKey);
          if (import.meta.env.DEV) console.log(`Decrypted ${doc.id} with legacy key`);
        } catch (error) {
          console.error(`Failed to decrypt key for ${doc.id}:`, error);
        }
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
