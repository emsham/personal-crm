export interface EncryptedData {
  ciphertext: string;
  iv: string;
  version: number;
}

export interface ApiKeyDocument {
  providerId: string;
  encryptedKey: string;
  iv: string;
  encryptionVersion: number;
  keyHint?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type LLMProviderType = 'gemini' | 'openai' | 'anthropic' | string;

export interface ApiKeyEntry {
  providerId: LLMProviderType;
  apiKey: string;
}

export interface DecryptedApiKeys {
  [providerId: string]: string;
}
