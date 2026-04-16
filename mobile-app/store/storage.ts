import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';

// A simple wrapper so i18n can read/write a single key synchronously-ish
// (AsyncStorage is async, so we cache the value in memory after first load)
const memoryCache: Record<string, string> = {};

export const storage = {
  getString: (key: string): string | undefined => {
    return memoryCache[key];
  },
  set: async (key: string, value: string): Promise<void> => {
    memoryCache[key] = value;
    await AsyncStorage.setItem(key, value);
  },
  delete: async (key: string): Promise<void> => {
    delete memoryCache[key];
    await AsyncStorage.removeItem(key);
  },
  // Call this once on app boot to hydrate the memory cache
  hydrate: async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const pairs = await AsyncStorage.multiGet(keys as string[]);
      pairs.forEach(([k, v]) => {
        if (v !== null) memoryCache[k] = v;
      });
    } catch (e) {
      console.warn('[storage] hydrate failed', e);
    }
  },
};

export const zustandStorage: StateStorage = {
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  getItem: (name: string) => {
    return AsyncStorage.getItem(name);
  },
  removeItem: (name: string) => {
    storage.delete(name);
  },
};