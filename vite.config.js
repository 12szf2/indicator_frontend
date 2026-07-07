import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import fs from 'fs';

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const version = packageJson.version;

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(version)
  },
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
    // Bundle analyzer plugin
    visualizer({
      filename: "dist/stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    allowedHosts: ["indikator.pollak.info"],
    //["*"],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    // Optimize dependencies
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Optimize CSS
    cssCodeSplit: true,
    // Source maps for debugging (optional, remove in production)
    sourcemap: false,
  },
});
