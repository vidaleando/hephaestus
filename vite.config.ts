import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "logo.svg", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Hephaestus",
        short_name: "Hephaestus",
        description: "A simple gym log for you and your friends.",
        theme_color: "#1f4fd1",
        background_color: "#eef1f5",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            // Last-loaded log, maxes and weigh-ins, so the app shows your data with no signal.
            // Network first: online you always get fresh data. Cleared on sign-out.
            urlPattern: ({ url, request }) =>
              request.method === "GET" && url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/v1/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-data",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
