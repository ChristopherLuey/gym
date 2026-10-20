import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  base: "/gym/",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "GYM — Your training, in rhythm",
        short_name: "GYM",
        description: "Your personal workout and machine planner",
        id: "/gym/",
        start_url: "/gym/",
        scope: "/gym/",
        display: "standalone",
        background_color: "#101214",
        theme_color: "#101214",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: "/gym/index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: { include: ["src/**/*.test.ts"], setupFiles: ["src/test-setup.ts"] },
  build: {
    rollupOptions: { output: { manualChunks: { charts: ["recharts"] } } },
  },
});
