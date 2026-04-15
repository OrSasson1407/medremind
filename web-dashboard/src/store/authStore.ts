import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: number; // FIX: Changed 'int' to 'number'
  email: string;
  full_name?: string | null;
  created_at?: string;
}

export interface AuthState { // FIX: Exported so App.tsx can use it
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'medremind-auth-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);