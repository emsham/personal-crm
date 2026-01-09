import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
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
 * Automatically decrypts keys trying multiple encryption keys for cross-platform compatibility.
 * Order of attempts: webKey (100k iter) -> mobileKey (10k iter) -> legacyKey
 *
 * @param userId - The user's Firebase UID
 * @param webEncryptionKey - Key derived with 100k iterations (web default)
 * @param mobileEncryptionKey - Key derived with 10k iterations (mobile compatibility)
 * @param callback - Called with decrypted keys whenever Firestore updates
 */
export function subscribeToApiKeys(
  userId: string,
  webEncryptionKey: string,
  mobileEncryptionKey: string,
  callback: (keys: DecryptedApiKeys) => void
): () => void {
  const keysRef = collection(db, 'users', userId, 'apiKeys');
  // Derive legacy key for backward compatibility with very old encrypted keys
  const legacyKey = deriveLegacyEncryptionKey(userId);

  return onSnapshot(keysRef, (snapshot) => {
    const decryptedKeys: DecryptedApiKeys = {};

    // Validate decrypted key is ASCII-only (API keys are always ASCII)
    const isValidApiKey = (key: string): boolean => {
      if (!key || key.length === 0) return false;
      for (let i = 0; i < key.length; i++) {
        if (key.charCodeAt(i) > 127) return false;
      }
      return true;
    };

    // Try to decrypt with a given key, returns decrypted value or null
    const tryDecrypt = (encryptedData: EncryptedData, key: string): string | null => {
      try {
        const decrypted = decryptApiKey(encryptedData, key);
        if (isValidApiKey(decrypted)) {
          return decrypted;
        }
      } catch {
        // Decryption failed
      }
      return null;
    };

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const encryptedData: EncryptedData = {
        ciphertext: data.encryptedKey,
        iv: data.iv,
        version: data.encryptionVersion,
      };

      // Try web key first (100k iterations - most likely for web-saved keys)
      let decrypted = tryDecrypt(encryptedData, webEncryptionKey);
      if (decrypted) {
        decryptedKeys[doc.id] = decrypted;
        return;
      }

      // Try mobile key (10k iterations - for keys saved from mobile app)
      decrypted = tryDecrypt(encryptedData, mobileEncryptionKey);
      if (decrypted) {
        if (import.meta.env.DEV) console.log(`Decrypted ${doc.id} with mobile iteration key`);
        decryptedKeys[doc.id] = decrypted;
        return;
      }

      // Fall back to legacy key for very old keys
      decrypted = tryDecrypt(encryptedData, legacyKey);
      if (decrypted) {
        if (import.meta.env.DEV) console.log(`Decrypted ${doc.id} with legacy key`);
        decryptedKeys[doc.id] = decrypted;
        return;
      }

      console.error(`Failed to decrypt key for ${doc.id}: No valid key found`);
    });

    callback(decryptedKeys);
  });
}

/**
 * Saves an encrypted API key to Firestore.
 * Properly handles create vs update to maintain createdAt timestamp.
 */
export async function saveApiKey(
  userId: string,
  providerId: string,
  apiKey: string,
  encryptionKey: string
): Promise<void> {
  const keyRef = doc(db, 'users', userId, 'apiKeys', providerId);
  const encrypted = encryptApiKey(apiKey, encryptionKey);
  const docSnap = await getDoc(keyRef);

  if (docSnap.exists()) {
    // Update existing - preserve createdAt, only update the encrypted data
    await updateDoc(keyRef, {
      encryptedKey: encrypted.ciphertext,
      iv: encrypted.iv,
      encryptionVersion: encrypted.version,
      keyHint: getKeyHint(apiKey),
      updatedAt: serverTimestamp(),
    });
  } else {
    // Create new - set both timestamps
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
