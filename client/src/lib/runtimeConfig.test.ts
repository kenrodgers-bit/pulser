import { describe, expect, it } from "vitest";

import { resolveRuntimeConfig } from "./runtimeConfig";

describe("resolveRuntimeConfig", () => {
  it("uses the Vite proxy for local development when backend urls are blank", () => {
    expect(
      resolveRuntimeConfig({
        apiUrl: "",
        serverUrl: "",
        dev: true,
        browserOrigin: "http://localhost:5173",
      }),
    ).toEqual({
      apiBaseUrl: "/api",
      apiOrigin: "http://localhost:5173",
      realtimeOrigin: "http://localhost:5173",
      isBackendConfigured: true,
      isRealtimeConfigured: true,
    });
  });

  it("normalizes trailing slashes and derives the realtime origin from the api url", () => {
    expect(
      resolveRuntimeConfig({
        apiUrl: "https://api.pulse.app/api/",
        serverUrl: "",
        dev: false,
        browserOrigin: "https://pulse.app",
      }),
    ).toEqual({
      apiBaseUrl: "https://api.pulse.app/api",
      apiOrigin: "https://api.pulse.app",
      realtimeOrigin: null,
      isBackendConfigured: true,
      isRealtimeConfigured: false,
    });
  });

  it("derives the api base from the realtime host when only VITE_SERVER_URL is set", () => {
    expect(
      resolveRuntimeConfig({
        apiUrl: "",
        serverUrl: "https://realtime.pulse.app/",
        dev: false,
        browserOrigin: "https://pulse.app",
      }),
    ).toEqual({
      apiBaseUrl: "https://realtime.pulse.app/api",
      apiOrigin: "https://realtime.pulse.app",
      realtimeOrigin: "https://realtime.pulse.app",
      isBackendConfigured: true,
      isRealtimeConfigured: true,
    });
  });

  it("repairs a server url that was configured with an /api suffix", () => {
    expect(
      resolveRuntimeConfig({
        apiUrl: "",
        serverUrl: "https://api.pulse.app/api",
        dev: false,
        browserOrigin: "https://pulse.app",
      }),
    ).toEqual({
      apiBaseUrl: "https://api.pulse.app/api",
      apiOrigin: "https://api.pulse.app",
      realtimeOrigin: "https://api.pulse.app",
      isBackendConfigured: true,
      isRealtimeConfigured: true,
    });
  });

  it("defaults production deployments to a same-origin api when no env vars are set", () => {
    expect(
      resolveRuntimeConfig({
        apiUrl: "",
        serverUrl: "",
        dev: false,
        browserOrigin: "https://pulse.app",
      }),
    ).toEqual({
      apiBaseUrl: "/api",
      apiOrigin: "https://pulse.app",
      realtimeOrigin: null,
      isBackendConfigured: true,
      isRealtimeConfigured: false,
    });
  });

  it("ignores localhost backend env values in production builds", () => {
    expect(
      resolveRuntimeConfig({
        apiUrl: "http://localhost:4000/api",
        serverUrl: "http://localhost:4000",
        dev: false,
        browserOrigin: "https://pulse.app",
      }),
    ).toEqual({
      apiBaseUrl: "/api",
      apiOrigin: "https://pulse.app",
      realtimeOrigin: null,
      isBackendConfigured: true,
      isRealtimeConfigured: false,
    });
  });
});
