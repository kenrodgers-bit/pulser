const LOCAL_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i;

const trimValue = (value?: string) => value?.trim() || "";
const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const stripApiSuffix = (value: string) => stripTrailingSlash(value).replace(/\/api$/i, "");

const normalizeApiUrl = (value?: string) => {
  const candidate = stripTrailingSlash(trimValue(value));

  if (!candidate) {
    return "";
  }

  try {
    const url = new URL(candidate);

    if (!url.pathname || url.pathname === "/") {
      url.pathname = "/api";
    }

    return stripTrailingSlash(url.toString());
  } catch {
    return candidate;
  }
};

const normalizeServerOrigin = (value?: string) => {
  const candidate = stripTrailingSlash(trimValue(value));
  return candidate ? stripApiSuffix(candidate) : "";
};

type RuntimeConfigInput = {
  apiUrl?: string;
  serverUrl?: string;
  dev: boolean;
  browserOrigin: string;
};

type RuntimeConfig = {
  apiBaseUrl: string | null;
  apiOrigin: string | null;
  realtimeOrigin: string | null;
  isBackendConfigured: boolean;
  isRealtimeConfigured: boolean;
};

export const resolveRuntimeConfig = ({
  apiUrl,
  serverUrl,
  dev,
  browserOrigin,
}: RuntimeConfigInput): RuntimeConfig => {
  const configuredApiUrl = normalizeApiUrl(apiUrl);
  const configuredServerOrigin = normalizeServerOrigin(serverUrl);
  const safeApiUrl =
    !dev && LOCAL_URL_PATTERN.test(configuredApiUrl) ? "" : configuredApiUrl;
  const safeServerOrigin =
    !dev && LOCAL_URL_PATTERN.test(configuredServerOrigin)
      ? ""
      : configuredServerOrigin;
  const shouldUseDevProxy =
    dev &&
    (!safeApiUrl || LOCAL_URL_PATTERN.test(safeApiUrl)) &&
    (!safeServerOrigin || LOCAL_URL_PATTERN.test(safeServerOrigin));

  if (shouldUseDevProxy) {
    return {
      apiBaseUrl: "/api",
      apiOrigin: browserOrigin,
      realtimeOrigin: browserOrigin,
      isBackendConfigured: true,
      isRealtimeConfigured: true,
    };
  }

  const apiBaseUrl =
    safeApiUrl || (safeServerOrigin ? `${safeServerOrigin}/api` : !dev ? "/api" : null);
  const apiOrigin = safeApiUrl
    ? stripApiSuffix(safeApiUrl)
    : safeServerOrigin || (!dev ? browserOrigin : null);
  const realtimeOrigin = safeServerOrigin || null;

  return {
    apiBaseUrl,
    apiOrigin,
    realtimeOrigin,
    isBackendConfigured: Boolean(apiBaseUrl),
    isRealtimeConfigured: Boolean(realtimeOrigin),
  };
};

const runtimeConfig = resolveRuntimeConfig({
  apiUrl: import.meta.env.VITE_API_URL,
  serverUrl: import.meta.env.VITE_SERVER_URL,
  dev: import.meta.env.DEV,
  browserOrigin:
    typeof window === "undefined" ? "http://localhost:5173" : window.location.origin,
});

export const missingBackendMessage =
  "Pulse backend is not configured for this deployment yet.";

export const apiBaseUrl = runtimeConfig.apiBaseUrl;
export const apiOrigin = runtimeConfig.apiOrigin;
export const realtimeOrigin = runtimeConfig.realtimeOrigin;
export const isBackendConfigured = runtimeConfig.isBackendConfigured;
export const isRealtimeConfigured = runtimeConfig.isRealtimeConfigured;
