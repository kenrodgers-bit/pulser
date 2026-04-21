import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA, type ManifestOptions } from "vite-plugin-pwa";

const pulseManifest: Partial<ManifestOptions> = {
  name: "Pulse",
  short_name: "Pulse",
  description: "Pulse is a social-first PWA messenger blending Instagram stories with Telegram-style chats and channels.",
  theme_color: "#07101a",
  background_color: "#07101a",
  display: "standalone",
  orientation: "portrait",
  start_url: "/",
  icons: [
    {
      src: "/icons/pulse-192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      src: "/icons/pulse-512.png",
      sizes: "512x512",
      type: "image/png",
    },
    {
      src: "/icons/pulse-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      manifest: pulseManifest,
      includeAssets: ["icons/*.png"],
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
      "/health": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "ws://localhost:4000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
