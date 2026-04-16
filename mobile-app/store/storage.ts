import { MMKV } from 'react-native-mmkv';
import { StateStorage } from 'zustand/middleware';

/**
 * Reverting to MMKV v2 syntax for Expo Go compatibility.
 * Version 2 uses the 'new MMKV()' constructor and '.delete()' method.
 */
export const storage = new MMKV({
  id: 'patient-offline-storage'
});

export const zustandStorage: StateStorage = {
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name: string) => {
    storage.delete(name);
  },
};