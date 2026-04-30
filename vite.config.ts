import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png"],
      manifest: {
        name: "KIET Attendance Dashboard",
        short_name: "Attendance",
        description: "KIET ERP Attendance Tracker & Planner",
        theme_color: "#ffffff",
        background_color: "#f8fafc",
        display: "standalone",
        icons: [
          {
            src: "favicon.png",
            sizes: "192x192 512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    host: "0.0.0.0",
    port: 5173
  }
});
