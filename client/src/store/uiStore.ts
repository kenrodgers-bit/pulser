import { create } from "zustand";

type ThemeMode = "dark" | "light" | "system";

type Toast = {
  id: string;
  title: string;
  description?: string;
};

type MediaViewerState = {
  open: boolean;
  src?: string;
  type?: "image" | "video";
  title?: string;
  warning?: string;
  layoutId?: string;
};

type UIState = {
  theme: ThemeMode;
  installPromptEvent: BeforeInstallPromptEvent | null;
  toasts: Toast[];
  mediaViewer: MediaViewerState;
  setTheme: (theme: ThemeMode) => void;
  setInstallPromptEvent: (event: BeforeInstallPromptEvent | null) => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  openMediaViewer: (viewer: MediaViewerState) => void;
  closeMediaViewer: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  theme: "dark",
  installPromptEvent: null,
  toasts: [],
  mediaViewer: {
    open: false,
  },
  setTheme: (theme) => set({ theme }),
  setInstallPromptEvent: (event) => set({ installPromptEvent: event }),
  pushToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id: crypto.randomUUID(),
          ...toast,
        },
      ],
    })),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  openMediaViewer: (viewer) =>
    set({
      mediaViewer: viewer,
    }),
  closeMediaViewer: () =>
    set({
      mediaViewer: {
        open: false,
      },
    }),
}));
