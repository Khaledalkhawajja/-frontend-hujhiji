/// <reference types="vitest" />
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Where the dev server forwards /api when VITE_API_URL is a relative path ("/api/v1").
  const proxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:4000";

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "prompt",
        includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
        manifest: {
          name: "AI Classroom",
          short_name: "AI Classroom",
          description: "Camera-based class attendance for students, instructors and admins.",
          theme_color: "#8B1E26",
          background_color: "#F3F4F6",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          // Only the static app shell is cached. API responses carry personal data and are never cached.
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [],
        },
        devOptions: { enabled: false },
      }),
    ],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      host: "localhost",
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": { target: proxyTarget, changeOrigin: false },
      },
    },
    preview: { host: "localhost", port: 5173, strictPort: true },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      css: false,
    },
  };
});
