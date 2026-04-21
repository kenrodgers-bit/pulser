const LOCAL_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i;

const trimValue = (value?: string) => value?.trim() || "";

const configuredApiUrl = trimValue(import.meta.env.VITE_API_URL);
const configuredServerUrl = trimValue(import.meta.env.VITE_SERVER_URL);

const shouldUseDevProxy =
  import.meta.env.DEV &&
  (!configuredApiUrl || LOCAL_URL_PATTERN.test(configuredApiUrl)) &&
  (!configuredServerUrl || LOCAL_URL_PATTERN.test(configuredServerUrl));

export const missingBackendMessage =
  "Pulse backend is not configured for this deployment yet.";

export const apiBaseUrl = shouldUseDevProxy
  ? "/api"
  : configuredApiUrl || null;

export const apiOrigin = shouldUseDevProxy
  ? window.location.origin
  : configuredApiUrl
    ? configuredApiUrl.replace(/\/api$/, "")
    : null;

export const realtimeOrigin = shouldUseDevProxy
  ? window.location.origin
  : configuredServerUrl ||
    (configuredApiUrl ? configuredApiUrl.replace(/\/api$/, "") : null);

export const isBackendConfigured = Boolean(apiBaseUrl);
export const isRealtimeConfigured = Boolean(realtimeOrigin);
