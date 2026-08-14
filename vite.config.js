import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],

  server: {
    port: 5173,
    allowedHosts: ["nexushub-console-production.up.railway.app"],
  },

  preview: {
    allowedHosts: ["nexushub-console-production.up.railway.app"],
  },
});
