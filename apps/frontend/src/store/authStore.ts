import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AuthState {
  token: string | null;
  walletAddress: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  setAuth: (walletAddress: string, token: string, userId: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      walletAddress: null,
      userId: null,
      isAuthenticated: false,

      setAuth: (walletAddress, token, userId) =>
        set({ token, walletAddress, userId, isAuthenticated: true }),

      clear: () =>
        set({ token: null, walletAddress: null, userId: null, isAuthenticated: false }),
    }),
    {
      name: "deadhand-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        walletAddress: state.walletAddress,
        userId: state.userId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
