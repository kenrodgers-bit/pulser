import { create } from "zustand";

import { api } from "@/lib/api";
import type { User } from "@/types";

type AuthState = {
  user: User | null;
  isBootstrapping: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setBootstrapping: (value: boolean) => void;
  fetchCurrentUser: () => Promise<User>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isBootstrapping: true,
  initialized: false,
  setUser: (user) =>
    set({
      user,
      initialized: true,
    }),
  setBootstrapping: (value) =>
    set({
      isBootstrapping: value,
      initialized: !value,
    }),
  fetchCurrentUser: async () => {
    const response = await api.get("/auth/me");
    const user = response.data.data.user as User;

    set({
      user,
      isBootstrapping: false,
      initialized: true,
    });

    return user;
  },
}));
