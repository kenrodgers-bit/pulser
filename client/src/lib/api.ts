import axios from "axios";

const LOCAL_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i;
const configuredApiUrl = import.meta.env.VITE_API_URL;
const shouldUseDevProxy =
  import.meta.env.DEV &&
  (!configuredApiUrl || LOCAL_URL_PATTERN.test(configuredApiUrl));

const API_URL = shouldUseDevProxy
  ? "/api"
  : configuredApiUrl || "http://localhost:4000/api";
const API_ORIGIN = shouldUseDevProxy
  ? window.location.origin
  : (configuredApiUrl || "http://localhost:4000/api").replace(/\/api$/, "");

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export const resolveApiUrl = (path = "") =>
  new URL(path.startsWith("/") ? path : `/${path}`, `${API_ORIGIN}/`).toString();

let refreshPromise: Promise<void> | null = null;

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
