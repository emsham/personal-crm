import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  encryptApiKey,
  decryptApiKey,
  getKeyHint,
  EncryptedData,
  DecryptedApiKeys,
} from '../shared/crypto';

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
