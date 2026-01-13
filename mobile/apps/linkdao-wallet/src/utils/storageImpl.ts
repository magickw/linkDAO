import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { StorageProvider, SecureStorageProvider, setStorageProvider, setSecureStorageProvider } from '@linkdao/shared/utils/storage';

class AsyncStorageProvider implements StorageProvider {
  async getItem(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(key);
  }
  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }
  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
  async clear(): Promise<void> {
    await AsyncStorage.clear();
  }
}

class SecureStoreProvider implements SecureStorageProvider {
  async getItem(key: string): Promise<string | null> {
    return await SecureStore.getItemAsync(key);
  }
  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  }
  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  }
  async clear(): Promise<void> {
    // SecureStore doesn't have a clear all method, we'd need to track keys
    // For now, we'll leave it as is or implement key tracking if needed
  }
}

export const initStorage = () => {
  setStorageProvider(new AsyncStorageProvider());
  setSecureStorageProvider(new SecureStoreProvider());
};
