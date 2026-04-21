import { useCallback } from "react";

import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import type { User } from "@/types";

const getUserFromResponse = <T extends { user: User }>(response: { data: { data: T } }) =>
  response.data.data.user;

export const useAuth = () => {
  const { user, isBootstrapping, setUser, setBootstrapping, fetchCurrentUser } =
    useAuthStore();
  const pushToast = useUIStore((state) => state.pushToast);

  const initialize = useCallback(async () => {
    setBootstrapping(true);

    try {
      await fetchCurrentUser();
    } catch {
      setUser(null);
      setBootstrapping(false);
    }
  }, [fetchCurrentUser, setBootstrapping, setUser]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const response = await api.post("/auth/login", {
        identifier,
        password,
      });
      const nextUser = getUserFromResponse(response);
      setUser(nextUser);
      pushToast({
        title: "Welcome back",
        description: `Signed in as ${nextUser.displayName}.`,
      });
      return nextUser;
    },
    [pushToast, setUser],
  );

  const register = useCallback(
    async (payload: {
      username: string;
      displayName: string;
      email: string;
      password: string;
    }) => {
      const response = await api.post("/auth/register", payload);
      const nextUser = getUserFromResponse(response);
      setUser(nextUser);
      pushToast({
        title: "Pulse is ready",
        description: `Account created for @${nextUser.username}.`,
      });
      return nextUser;
    },
    [pushToast, setUser],
  );

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
  }, [setUser]);

  const updateProfile = useCallback(
    async (payload: FormData | Record<string, unknown>) => {
      const response = await api.put("/auth/profile", payload, {
        headers:
          payload instanceof FormData
            ? {
                "Content-Type": "multipart/form-data",
              }
            : undefined,
      });
      const nextUser = getUserFromResponse(response);
      setUser(nextUser);
      pushToast({
        title: "Profile updated",
        description: "Your Pulse profile changes are live.",
      });
      return nextUser;
    },
    [pushToast, setUser],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await api.put("/auth/password", {
        currentPassword,
        newPassword,
      });
      setUser(null);
      pushToast({
        title: "Password changed",
        description: "Please sign in again with your new password.",
      });
    },
    [pushToast, setUser],
  );

  return {
    user,
    isBootstrapping,
    initialize,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    fetchCurrentUser,
  };
};
