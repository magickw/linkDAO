import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cache data for offline use
 */
export const cacheData = async (key: string, data: any): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error caching data:', error);
    return false;
  }
};

/**
 * Get cached data
 */
export const getCachedData = async (key: string): Promise<any | null> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting cached data:', error);
    return null;
  }
};

/**
 * Remove cached data
 */
export const removeCachedData = async (key: string): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing cached data:', error);
    return false;
  }
};

/**
 * Clear all cached data
 */
export const clearAllCachedData = async (): Promise<boolean> => {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing cached data:', error);
    return false;
  }
};

/**
 * Get all cached keys
 */
export const getAllCachedKeys = async (): Promise<string[]> => {
  try {
    return await AsyncStorage.getAllKeys();
  } catch (error) {
    console.error('Error getting cached keys:', error);
    return [];
  }
};

/**
 * Cache multiple items
 */
export const cacheMultipleItems = async (items: { key: string; data: any }[]): Promise<boolean> => {
  try {
    const batch: [string, string][] = items.map(item => [
      item.key,
      JSON.stringify(item.data)
    ]);
    
    await AsyncStorage.multiSet(batch);
    return true;
  } catch (error) {
    console.error('Error caching multiple items:', error);
    return false;
  }
};

/**
 * Get multiple cached items
 */
export const getMultipleCachedItems = async (keys: string[]): Promise<any[]> => {
  try {
    const items = await AsyncStorage.multiGet(keys);
    return items.map(([key, value]) => value ? JSON.parse(value) : null);
  } catch (error) {
    console.error('Error getting multiple cached items:', error);
    return [];
  }
};

/**
 * Remove multiple cached items
 */
export const removeMultipleCachedItems = async (keys: string[]): Promise<boolean> => {
  try {
    await AsyncStorage.multiRemove(keys);
    return true;
  } catch (error) {
    console.error('Error removing multiple cached items:', error);
    return false;
  }
};

/**
 * Check if data is expired
 */
export const isDataExpired = (timestamp: number, maxAge: number): boolean => {
  const now = Date.now();
  return (now - timestamp) > maxAge;
};

/**
 * Get cache size
 */
export const getCacheSize = async (): Promise<number> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const items = await AsyncStorage.multiGet(keys);
    let size = 0;
    
    items.forEach(([key, value]) => {
      size += key.length + (value ? value.length : 0);
    });
    
    return size;
  } catch (error) {
    console.error('Error getting cache size:', error);
    return 0;
  }
};

/**
 * Get formatted cache size
 */
export const getFormattedCacheSize = async (): Promise<string> => {
  const size = await getCacheSize();
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
  return (size / (1024 * 1024)).toFixed(2) + ' MB';
};