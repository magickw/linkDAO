export interface StorageProvider {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface SecureStorageProvider extends StorageProvider {}

let storage: StorageProvider;
let secureStorage: SecureStorageProvider;

export const setStorageProvider = (provider: StorageProvider) => {
  storage = provider;
};

export const setSecureStorageProvider = (provider: SecureStorageProvider) => {
  secureStorage = provider;
};

export const getStorage = () => {
  if (!storage) throw new Error('Storage provider not initialized');
  return storage;
};

export const getSecureStorage = () => {
  if (!secureStorage) throw new Error('Secure storage provider not initialized');
  return secureStorage;
};
