import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],

  server: {
    port: 5173,
    allowedHosts: [
      "admin.ctrlcat.my",
      "reddit-admin-production.up.railway.app",
      "reddit-admin-production-34af.up.railway.app",
    ],
  },

  preview: {
    allowedHosts: [
      "admin.ctrlcat.my",
      "reddit-admin-production.up.railway.app",
      "reddit-admin-production-34af.up.railway.app",
    ],
  },
});
