import { create } from "zustand";

interface EmergencyState {
  stopped: boolean;
  stoppedAt: string | null;
  setStopped: (stopped: boolean, at?: string) => void;
}

export const useEmergencyStore = create<EmergencyState>((set) => ({
  stopped: false,
  stoppedAt: null,
  setStopped: (stopped, at) =>
    set({ stopped, stoppedAt: stopped ? (at ?? new Date().toISOString()) : null }),
}));
