import axios from "axios";

import {
  apiBaseUrl,
  apiOrigin,
  isBackendConfigured,
  missingBackendMessage,
} from "@/lib/runtimeConfig";

const createBackendConfigError = () =>
  Object.assign(new Error(missingBackendMessage), {
    code: "PULSE_BACKEND_NOT_CONFIGURED",
  });

export const api = axios.create({
  baseURL: apiBaseUrl ?? "/api",
  withCredentials: true,
});

export const resolveApiUrl = (path = "") =>
  apiOrigin
    ? new URL(path.startsWith("/") ? path : `/${path}`, `${apiOrigin}/`).toString()
    : null;

let refreshPromise: Promise<void> | null = null;

api.interceptors.request.use((config) => {
  if (!isBackendConfigured) {
    return Promise.reject(createBackendConfigError());
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !String(originalRequest?.url ?? "").includes("/auth/login") &&
      !String(originalRequest?.url ?? "").includes("/auth/register") &&
      !String(originalRequest?.url ?? "").includes("/auth/refresh")
    ) {
      originalRequest._retry = true;

      refreshPromise ??= api
        .post("/auth/refresh")
        .then(() => undefined)
        .finally(() => {
          refreshPromise = null;
        });

      await refreshPromise;

      return api(originalRequest);
    }

    return Promise.reject(error);
  },
);
