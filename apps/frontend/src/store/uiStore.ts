import { create } from "zustand";

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
}

interface UIState {
  toasts: Toast[];
  sidebarCollapsed: boolean;
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  toggleSidebar: () => void;
}

let toastIdCounter = 0;

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  sidebarCollapsed: false,

  addToast: (toast) => {
    const id = String(++toastIdCounter);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));

export function useToast() {
  const { addToast } = useUIStore();
  return {
    success: (message: string) => addToast({ type: "success", message }),
    error: (message: string) => addToast({ type: "error", message }),
    warning: (message: string) => addToast({ type: "warning", message }),
    info: (message: string) => addToast({ type: "info", message }),
  };
}
